import { useLiveQuery } from 'dexie-react-hooks'
import { alive, db, DEFAULT_GOALS, DEFAULT_PROFILE } from './db'
import type { Goals, Profile } from './types'
import { addDays, daysBetween, today } from '../lib/dates'
import { activityFactor, bmr, nutritionTargets, type NutritionTargets } from '../lib/rules/nutrition'
import { cardioKcal, stepsKcal, workoutKcal } from '../lib/rules/energy'

// Ces fonctions relisent la base automatiquement dès qu'une donnée change.
// Elles renvoient undefined pendant le tout premier chargement.

export const useExercises = () =>
  useLiveQuery(async () => alive(await db.exercises.toArray()).sort((a, b) => a.name.localeCompare(b.name)))

export const useTemplates = () =>
  useLiveQuery(async () => alive(await db.templates.toArray()).sort((a, b) => a.order - b.order))

export const useWorkouts = () =>
  useLiveQuery(async () => alive(await db.workouts.toArray()).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)))

export const useCardio = () =>
  useLiveQuery(async () => alive(await db.cardio.toArray()).sort((a, b) => (a.date < b.date ? 1 : -1)))

export const useFoods = () =>
  useLiveQuery(async () => alive(await db.foods.toArray()).sort((a, b) => a.name.localeCompare(b.name)))

export const useRecipes = () =>
  useLiveQuery(async () => alive(await db.recipes.toArray()).sort((a, b) => a.name.localeCompare(b.name)))

export const useMealsOn = (date: string) =>
  useLiveQuery(async () => alive(await db.meals.where('date').equals(date).toArray()), [date])

export const useMeals = () => useLiveQuery(async () => alive(await db.meals.toArray()))

export const useMeasures = () =>
  useLiveQuery(async () => alive(await db.measures.toArray()).sort((a, b) => (a.date < b.date ? -1 : 1)))

export const useSteps = () => useLiveQuery(async () => alive(await db.steps.toArray()))

export interface SettingsState {
  profile: Profile
  goals: Goals
  profileSaved: boolean
}

export const useSettings = () =>
  useLiveQuery(async (): Promise<SettingsState> => {
    const [p, g] = await Promise.all([db.settings.get('profile'), db.settings.get('goals')])
    return {
      profile: { ...DEFAULT_PROFILE, ...((p?.value as Profile) ?? {}) },
      goals: { ...DEFAULT_GOALS, ...((g?.value as Goals) ?? {}) },
      profileSaved: !!p,
    }
  })

export interface NutritionState {
  weight: number | null
  targets: NutritionTargets | null
  factor: number
  measuredFactor: boolean // facteur calculé sur l'activité réelle
}

// Besoins du jour : profil + dernier poids + activité réelle des 4 dernières semaines.
export const useNutrition = () =>
  useLiveQuery(async (): Promise<NutritionState> => {
    const [p, measures] = await Promise.all([db.settings.get('profile'), db.measures.toArray()])
    const profile = { ...DEFAULT_PROFILE, ...((p?.value as Profile) ?? {}) }
    const last = alive(measures).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    if (!last) return { weight: null, targets: null, factor: 0, measuredFactor: false }

    const end = today()
    const start = addDays(end, -27)
    const [workouts, cardio, steps] = await Promise.all([
      db.workouts.where('date').between(start, end, true, true).toArray(),
      db.cardio.where('date').between(start, end, true, true).toArray(),
      db.steps.where('date').between(start, end, true, true).toArray(),
    ])
    const w = last.weightKg
    const kcal =
      alive(workouts).filter((x) => x.finished).reduce((s, x) => s + workoutKcal(x, w), 0) +
      alive(cardio).reduce((s, x) => s + cardioKcal(x, w), 0) +
      alive(steps).reduce((s, x) => s + stepsKcal(x.count, w), 0)

    // Nombre de jours couverts depuis la première activité enregistrée
    const allDates = [...alive(workouts), ...alive(cardio), ...alive(steps)].map((x) => x.date).sort()
    const days = allDates.length ? Math.min(28, 1 + daysBetween(allDates[0], end)) : 0

    const age = new Date().getFullYear() - profile.birthYear
    const base = bmr(w, profile.heightCm, age, profile.sex)
    const { factor, estimated } = activityFactor(days ? kcal / days : 0, base, days)
    return { weight: w, targets: nutritionTargets(w, profile, age, factor), factor, measuredFactor: estimated }
  })
