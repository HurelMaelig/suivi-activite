import type { Exercise, Template, Workout } from '../../db/types'

// Durée estimée d'un exercice : chaque série ≈ 40 s d'effort + le repos, plus 2 min d'installation.
export function exerciseMinutes(e: Exercise): number {
  return (e.sets * (e.restSec + 40)) / 60 + 2
}

const WARMUP_MIN = 5

function lastDone(workouts: Workout[], templateId: string): string {
  let last = ''
  for (const w of workouts) if (w.finished && !w.deleted && w.templateId === templateId && w.date > last) last = w.date
  return last
}

// La séance type dont la dernière réalisation est la plus ancienne (jamais faite = prioritaire).
export function pickTemplate(templates: Template[], workouts: Workout[]): Template | null {
  const candidates = templates.filter((t) => !t.deleted && !t.optional && t.exerciseIds.length > 0)
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => {
    const da = lastDone(workouts, a.id)
    const dbb = lastDone(workouts, b.id)
    return da === dbb ? a.order - b.order : da < dbb ? -1 : 1
  })[0]
}

// Choisit les exercices en alternant les groupes musculaires de la séance,
// pour qu'une séance courte garde un peu de chaque groupe (ex. dos ET triceps).
function roundRobin(list: Exercise[]): Exercise[] {
  const groups = new Map<string, Exercise[]>()
  for (const e of list) groups.set(e.muscle, [...(groups.get(e.muscle) ?? []), e])
  const out: Exercise[] = []
  const queues = [...groups.values()]
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!)
  return out
}

// Abdos : un exercice différent de celui de la séance précédente, en tournant dans la liste.
export function pickAbs(exercises: Exercise[], workouts: Workout[]): Exercise | null {
  const abs = exercises.filter((e) => !e.deleted && e.muscle === 'abdos').sort((a, b) => a.name.localeCompare(b.name))
  if (abs.length === 0) return null
  const absIds = new Set(abs.map((e) => e.id))
  const previous = [...workouts]
    .filter((w) => w.finished && !w.deleted)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .map((w) => w.entries.find((en) => absIds.has(en.exerciseId)))
    .find(Boolean)
  if (!previous) return abs[0]
  const i = abs.findIndex((e) => e.id === previous.exerciseId)
  return abs[(i + 1) % abs.length]
}

export interface SessionPlan {
  main: Exercise[]
  extra: Exercise[] // ajoutés depuis une séance optionnelle (Épaules) car il reste du temps
  abs: Exercise | null
  minutes: number // durée estimée
}

export function planSession(
  template: Template,
  templates: Template[],
  exercises: Exercise[],
  workouts: Workout[],
  availableMin: number,
): SessionPlan {
  const byId = new Map(exercises.filter((e) => !e.deleted).map((e) => [e.id, e]))
  const fromTemplate = template.exerciseIds.map((id) => byId.get(id)).filter((e): e is Exercise => !!e)
  const abs = pickAbs(exercises, workouts)
  let budget = availableMin - WARMUP_MIN - (abs ? exerciseMinutes(abs) : 0)

  const chosen = new Set<string>()
  for (const e of roundRobin(fromTemplate)) {
    const cost = exerciseMinutes(e)
    // Au moins 2 exercices, même si le temps est très court.
    if (cost <= budget || chosen.size < 2) {
      chosen.add(e.id)
      budget -= cost
    }
  }
  const main = fromTemplate.filter((e) => chosen.has(e.id))

  const extra: Exercise[] = []
  if (!template.optional) {
    const optionals = templates.filter((t) => t.optional && !t.deleted && t.id !== template.id)
    for (const t of optionals) {
      for (const id of t.exerciseIds) {
        const e = byId.get(id)
        if (!e || chosen.has(id)) continue
        const cost = exerciseMinutes(e)
        if (cost <= budget) {
          extra.push(e)
          chosen.add(id)
          budget -= cost
        }
      }
    }
  }

  const all = [...main, ...extra, ...(abs ? [abs] : [])]
  const minutes = Math.round(WARMUP_MIN + all.reduce((s, e) => s + exerciseMinutes(e), 0))
  return { main, extra, abs, minutes }
}
