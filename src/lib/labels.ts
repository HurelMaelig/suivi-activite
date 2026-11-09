import type { CardioType, MealSlot, Muscle } from '../db/types'

export const MUSCLE_LABEL: Record<Muscle, string> = {
  dos: 'Dos',
  pecs: 'Pectoraux',
  jambes: 'Jambes',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  abdos: 'Abdos',
}

export const CARDIO_LABEL: Record<CardioType, string> = { course: 'Course', velo: 'Vélo', natation: 'Natation' }

export const MEAL_LABEL: Record<MealSlot, string> = {
  'petit-dejeuner': 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  collation: 'Collation',
  diner: 'Dîner',
}
