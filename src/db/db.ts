import Dexie, { type Table } from 'dexie'
import type {
  Base,
  Cardio,
  Exercise,
  Food,
  Goals,
  MealEntry,
  Measure,
  Profile,
  Recipe,
  SettingRow,
  Settings,
  Steps,
  Template,
  Workout,
} from './types'
import { seed } from './seed'

// Base de données IndexedDB du navigateur : tout reste sur l'appareil et marche sans réseau.
export class AppDB extends Dexie {
  exercises!: Table<Exercise, string>
  templates!: Table<Template, string>
  workouts!: Table<Workout, string>
  cardio!: Table<Cardio, string>
  foods!: Table<Food, string>
  meals!: Table<MealEntry, string>
  recipes!: Table<Recipe, string>
  measures!: Table<Measure, string>
  steps!: Table<Steps, string>
  settings!: Table<SettingRow, string>

  constructor(name = 'suivi-activite') {
    super(name)
    // Seuls les champs listés ici sont indexés (servent aux recherches) ; les autres sont stockés quand même.
    this.version(1).stores({
      exercises: 'id, updated_at',
      templates: 'id, updated_at',
      workouts: 'id, date, updated_at',
      cardio: 'id, date, type, updated_at',
      foods: 'id, barcode, updated_at',
      meals: 'id, date, updated_at',
      recipes: 'id, updated_at',
      measures: 'id, date, updated_at',
      steps: 'id, date, updated_at',
      settings: 'id, updated_at',
    })
    // Données de départ, ajoutées une seule fois à la création de la base.
    this.on('populate', (tx) => seed(tx))
  }
}

export const db = new AppDB()

export const TABLES = [
  'exercises',
  'templates',
  'workouts',
  'cardio',
  'foods',
  'meals',
  'recipes',
  'measures',
  'steps',
  'settings',
] as const
export type TableName = (typeof TABLES)[number]

export const newId = () => crypto.randomUUID()
export const nowIso = () => new Date().toISOString()

export function stamp<T extends Base>(data: Omit<T, keyof Base> & Partial<Base>): T {
  return { ...data, id: data.id ?? newId(), updated_at: nowIso(), deleted: false } as T
}

export async function save<T extends Base>(table: Table<T, string>, record: T): Promise<void> {
  await table.put({ ...record, updated_at: nowIso() })
}

export async function remove<T extends Base>(table: Table<T, string>, id: string): Promise<void> {
  const row = await table.get(id)
  if (row) await table.put({ ...row, deleted: true, updated_at: nowIso() })
}

export const alive = <T extends Base>(rows: T[]) => rows.filter((r) => !r.deleted)

export const DEFAULT_PROFILE: Profile = {
  heightCm: 175,
  birthYear: 1995,
  sex: 'homme',
  goal: 'maintien',
  excluded: [],
}

export const DEFAULT_GOALS: Goals = {
  gymPerWeek: 3,
  cardioPerWeek: 2,
  weeklyKm: { course: 15, velo: 40, natation: 2 },
  yearlyKm: { course: 600, velo: 1500, natation: 60 },
  yearlyGym: 140,
  stepsPerDay: 8000,
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ id: key, value, updated_at: nowIso(), deleted: false })
}
