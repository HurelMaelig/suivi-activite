import type { Cardio, Workout } from '../../db/types'

// Estimations à partir des équivalents métaboliques (MET) usuels.
// Ce sont des ordres de grandeur, pas des mesures.

export function cardioKcal(c: Cardio, weightKg: number): number {
  const hours = c.durationMin / 60
  if (c.type === 'course') return Math.round(1.0 * weightKg * c.distanceKm) // ≈ 1 kcal/kg/km
  if (c.type === 'velo') {
    const speed = hours > 0 ? c.distanceKm / hours : 0
    const met = speed < 20 ? 6.8 : speed < 25 ? 8 : 10
    return Math.round(met * weightKg * hours)
  }
  return Math.round(7 * weightKg * hours) // natation, allure modérée
}

export function workoutKcal(w: Workout, weightKg: number): number {
  return Math.round(5 * weightKg * (w.durationMin / 60))
}

// Calories des pas en plus de la vie normale (≈ 0,0005 kcal par kg et par pas)
export function stepsKcal(steps: number, weightKg: number): number {
  return Math.round(steps * weightKg * 0.0005)
}
