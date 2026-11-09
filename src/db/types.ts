// Chaque enregistrement porte ces trois champs : ils serviront à la synchronisation (Phase 2).
export interface Base {
  id: string
  updated_at: string // date ISO de la dernière modification
  deleted: boolean // suppression douce : la ligne reste, marquée supprimée
}

export type Muscle = 'dos' | 'pecs' | 'jambes' | 'epaules' | 'biceps' | 'triceps' | 'abdos'

export interface Exercise extends Base {
  name: string
  muscle: Muscle
  kind: 'poly' | 'iso' // polyarticulaire ou isolation
  repMin: number
  repMax: number
  sets: number
  restSec: number
  bodyweight: boolean // au poids du corps : pas de charge proposée
}

export interface Template extends Base {
  name: string
  exerciseIds: string[]
  optional: boolean // séance proposée seulement s'il reste du temps (ex. Épaules)
  order: number
}

export interface WorkSet {
  reps: number
  weight: number
  done: boolean
}

export interface WorkoutEntry {
  exerciseId: string
  name: string
  sets: WorkSet[]
}

export type Feeling = 'facile' | 'correct' | 'dur'

export interface Workout extends Base {
  date: string // AAAA-MM-JJ
  startedAt: string
  templateId: string | null
  name: string
  durationMin: number
  entries: WorkoutEntry[]
  feeling: Feeling | null
  finished: boolean
}

export type CardioType = 'course' | 'velo' | 'natation'

export interface Cardio extends Base {
  date: string
  type: CardioType
  distanceKm: number
  durationMin: number
  avgHr: number | null
  source: 'manuelle' | 'strava' | 'fichier'
  notes: string
}

// Valeurs pour 100 g
export interface Food extends Base {
  name: string
  brand: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  barcode: string
  source: 'base' | 'manuel' | 'off'
}

export type MealSlot = 'petit-dejeuner' | 'dejeuner' | 'collation' | 'diner'

export interface MealEntry extends Base {
  date: string
  meal: MealSlot
  label: string
  quantity: string // texte affiché : « 150 g », « 1 portion »
  kcal: number
  protein: number
  carbs: number
  fat: number
  foodId: string | null
  recipeId: string | null
}

export type RecipeTag = 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation' | 'rapide' | 'vegetarien'

// Valeurs pour une portion
export interface Recipe extends Base {
  name: string
  tags: RecipeTag[]
  kcal: number
  protein: number
  carbs: number
  fat: number
  ingredients: string[]
  minutes: number
  notes: string
}

export interface Measure extends Base {
  date: string
  weightKg: number
}

export interface Steps extends Base {
  date: string
  count: number
  source: 'manuel' | 'raccourci'
}

export type Sex = 'homme' | 'femme'
export type Goal = 'maintien' | 'seche' | 'prise'

export interface Profile {
  heightCm: number
  birthYear: number
  sex: Sex
  goal: Goal
  excluded: string[] // mots : un plat contenant l'un d'eux n'est jamais proposé
}

export interface Goals {
  gymPerWeek: number
  cardioPerWeek: number
  weeklyKm: Record<CardioType, number>
  yearlyKm: Record<CardioType, number>
  yearlyGym: number
  stepsPerDay: number
}

export interface Settings {
  profile: Profile
  goals: Goals
}

export interface SettingRow<K extends keyof Settings = keyof Settings> extends Base {
  value: Settings[K]
}
