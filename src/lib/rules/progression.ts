import type { Exercise, WorkSet, Workout } from '../../db/types'
import { daysBetween } from '../dates'

export interface ExerciseSession {
  date: string
  sets: WorkSet[] // seulement les séries validées
}

export interface LoadSuggestion {
  weight: number | null // null : pas encore d'historique
  reps: string // fourchette visée, ex. « 6-10 »
  reason: string
  kind: 'premiere' | 'hausse' | 'maintien' | 'allegee'
}

export const roundLoad = (kg: number) => Math.round(kg * 2) / 2

// Historique d'un exercice, du plus ancien au plus récent.
export function exerciseHistory(workouts: Workout[], exerciseId: string): ExerciseSession[] {
  return workouts
    .filter((w) => w.finished && !w.deleted)
    .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
    .flatMap((w) => {
      const entry = w.entries.find((e) => e.exerciseId === exerciseId)
      const sets = entry?.sets.filter((s) => s.done && s.reps > 0) ?? []
      return sets.length ? [{ date: w.date, sets }] : []
    })
}

const topWeight = (s: ExerciseSession) => Math.max(...s.sets.map((x) => x.weight))
const totalReps = (s: ExerciseSession) => s.sets.reduce((n, x) => n + x.reps, 0)

function progressed(prev: ExerciseSession, cur: ExerciseSession): boolean {
  const wp = topWeight(prev)
  const wc = topWeight(cur)
  return wc > wp || (wc === wp && totalReps(cur) > totalReps(prev))
}

// Semaine allégée planifiée : la 6e, 12e, 18e… semaine depuis la toute première séance.
export function isScheduledDeload(workouts: Workout[], todayKey: string): boolean {
  const dates = workouts.filter((w) => w.finished && !w.deleted).map((w) => w.date)
  if (dates.length === 0) return false
  const first = dates.reduce((a, b) => (a < b ? a : b))
  const week = Math.floor(daysBetween(first, todayKey) / 7)
  return week > 0 && (week + 1) % 6 === 0
}

export function suggestLoad(ex: Exercise, history: ExerciseSession[], scheduledDeload: boolean): LoadSuggestion {
  const reps = `${ex.repMin}-${ex.repMax}`
  const last = history.at(-1)
  if (!last) {
    return {
      weight: null,
      reps,
      kind: 'premiere',
      reason: ex.bodyweight ? 'Première fois : note tes répétitions.' : 'Première fois : prends une charge confortable.',
    }
  }

  const weight = topWeight(last)
  const step = ex.muscle === 'jambes' ? 5 : 2.5

  // 3 séances d'affilée sans progrès (il faut donc 4 séances pour comparer)
  const recent = history.slice(-4)
  const stalled =
    recent.length === 4 && [1, 2, 3].every((i) => !progressed(recent[i - 1], recent[i]))

  if (!ex.bodyweight && weight > 0 && (stalled || scheduledDeload)) {
    return {
      weight: roundLoad(weight * 0.9),
      reps,
      kind: 'allegee',
      reason: stalled
        ? '3 séances sans progrès : semaine allégée à -10 %.'
        : 'Semaine allégée prévue (toutes les 6 semaines) : -10 %.',
    }
  }

  const allTop = last.sets.length >= ex.sets && last.sets.every((s) => s.reps >= ex.repMax)
  if (allTop) {
    if (ex.bodyweight) {
      return { weight, reps, kind: 'hausse', reason: `Haut de fourchette atteint : ajoute du lest ou une répétition.` }
    }
    return {
      weight: roundLoad(weight + step),
      reps,
      kind: 'hausse',
      reason: `Toutes les séries à ${ex.repMax} répétitions : +${String(step).replace('.', ',')} kg.`,
    }
  }

  const belowMin = (s: ExerciseSession) => s.sets.some((x) => x.reps < ex.repMin)
  const prev = history.at(-2)
  if (prev && belowMin(last) && belowMin(prev) && topWeight(prev) === weight) {
    return {
      weight,
      reps,
      kind: 'maintien',
      reason: `Bas de fourchette manqué 2 fois : garde la charge et vise ${ex.repMin} répétitions partout.`,
    }
  }

  return {
    weight,
    reps,
    kind: 'maintien',
    reason: `Même charge : vise ${ex.repMax} répétitions sur toutes les séries.`,
  }
}
