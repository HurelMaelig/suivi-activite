import { db, nowIso, stamp } from '../db/db'
import type { Exercise, Workout, WorkoutEntry } from '../db/types'
import { today } from './dates'
import { exerciseHistory, isScheduledDeload, suggestLoad } from './rules/progression'

// Prépare un exercice : séries pré-remplies avec la charge conseillée.
export function entryFor(ex: Exercise, workouts: Workout[]): WorkoutEntry {
  const history = exerciseHistory(workouts, ex.id)
  const s = suggestLoad(ex, history, isScheduledDeload(workouts, today()))
  const last = history.at(-1)
  // Après une hausse ou un allègement, on repart du bas de la fourchette.
  const keepReps = s.kind === 'maintien'
  const sets = Array.from({ length: ex.sets }, (_, i) => ({
    reps: keepReps ? (last?.sets[i]?.reps ?? last?.sets.at(-1)?.reps ?? ex.repMin) : ex.repMin,
    weight: s.weight ?? 0,
    done: false,
  }))
  return { exerciseId: ex.id, name: ex.name, sets }
}

export async function startSession(
  name: string,
  templateId: string | null,
  exercises: Exercise[],
  workouts: Workout[],
): Promise<Workout> {
  const w = stamp<Workout>({
    date: today(),
    startedAt: nowIso(),
    templateId,
    name,
    durationMin: 0,
    entries: exercises.map((e) => entryFor(e, workouts)),
    feeling: null,
    finished: false,
  })
  await db.workouts.put(w)
  return w
}
