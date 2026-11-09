import type { Profile } from '../../db/types'

// Métabolisme de base, formule de Mifflin-St Jeor
export function bmr(weightKg: number, heightCm: number, age: number, sex: Profile['sex']): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'homme' ? 5 : -161)
}

export const DEFAULT_FACTOR = 1.375

// Facteur d'activité : 1,2 (vie sédentaire) + la part réelle de calories d'exercice.
// dailyExerciseKcal = moyenne par jour sur les 4 dernières semaines.
export function activityFactor(dailyExerciseKcal: number, base: number, daysOfHistory: number) {
  if (daysOfHistory < 7 || base <= 0) return { factor: DEFAULT_FACTOR, estimated: false }
  const factor = Math.min(1.9, Math.max(1.2, 1.2 + dailyExerciseKcal / base))
  return { factor: Math.round(factor * 100) / 100, estimated: true }
}

export interface NutritionTargets {
  bmr: number
  tdee: number // dépense totale estimée
  kcal: number // objectif selon maintien / sèche / prise
  protein: number
  proteinMin: number
  proteinMax: number
  fat: number
  carbs: number
}

export function nutritionTargets(weightKg: number, profile: Profile, age: number, factor: number): NutritionTargets {
  const base = bmr(weightKg, profile.heightCm, age, profile.sex)
  const tdee = base * factor
  let kcal = tdee
  // Sèche : -400 kcal, jamais plus de 20 % de la dépense ; prise : +250 kcal
  if (profile.goal === 'seche') kcal = tdee - Math.min(400, tdee * 0.2)
  if (profile.goal === 'prise') kcal = tdee + 250

  const protein = 1.8 * weightKg
  // Lipides : au moins 0,8 g/kg, et au moins 25 % des calories
  const fat = Math.max(0.8 * weightKg, (kcal * 0.25) / 9)
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4)

  return {
    bmr: Math.round(base),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    proteinMin: Math.round(1.6 * weightKg),
    proteinMax: Math.round(2.2 * weightKg),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
  }
}
