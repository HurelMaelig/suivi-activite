import type { Transaction } from 'dexie'
import type { Exercise, Food, Muscle, Recipe, RecipeTag, Template } from './types'
import { RECIPES } from './recipes'

const now = () => new Date().toISOString()
const base = () => ({ id: crypto.randomUUID(), updated_at: now(), deleted: false })

function ex(
  name: string,
  muscle: Muscle,
  kind: 'poly' | 'iso',
  opts: Partial<Pick<Exercise, 'repMin' | 'repMax' | 'sets' | 'restSec' | 'bodyweight'>> = {},
): Exercise {
  const abs = muscle === 'abdos'
  return {
    ...base(),
    name,
    muscle,
    kind,
    repMin: kind === 'poly' ? 6 : abs ? 12 : 10,
    repMax: kind === 'poly' ? 10 : abs ? 20 : 12,
    sets: 3,
    restSec: kind === 'poly' ? 120 : abs ? 45 : 75,
    bodyweight: abs,
    ...opts,
  }
}

export function seedExercises() {
  const dos = [
    ex('Tractions', 'dos', 'poly', { bodyweight: true }),
    ex('Rowing barre', 'dos', 'poly'),
    ex('Tirage vertical', 'dos', 'poly'),
    ex('Rowing haltère un bras', 'dos', 'poly'),
  ]
  const triceps = [ex('Barre au front', 'triceps', 'iso'), ex('Extension triceps à la poulie', 'triceps', 'iso')]
  const pecs = [
    ex('Développé couché', 'pecs', 'poly'),
    ex('Développé incliné haltères', 'pecs', 'poly'),
    ex('Écarté à la poulie', 'pecs', 'iso'),
  ]
  const biceps = [ex('Curl barre', 'biceps', 'iso'), ex('Curl marteau', 'biceps', 'iso')]
  const jambes = [
    ex('Squat', 'jambes', 'poly'),
    ex('Presse à cuisses', 'jambes', 'poly'),
    ex('Soulevé de terre roumain', 'jambes', 'poly'),
    ex('Leg curl', 'jambes', 'iso'),
    ex('Fentes haltères', 'jambes', 'poly'),
    ex('Mollets debout', 'jambes', 'iso'),
  ]
  const epaules = [
    ex('Développé militaire', 'epaules', 'poly'),
    ex('Élévations latérales', 'epaules', 'iso'),
    ex('Oiseau', 'epaules', 'iso'),
    ex('Face pull', 'epaules', 'iso'),
  ]
  const abdos = [
    ex('Crunch', 'abdos', 'iso'),
    ex('Relevés de jambes suspendu', 'abdos', 'iso', { repMin: 8, repMax: 15 }),
    ex('Roue abdominale', 'abdos', 'iso', { repMin: 8, repMax: 15 }),
    ex('Gainage (secondes)', 'abdos', 'iso', { repMin: 30, repMax: 60 }),
  ]
  const ids = (list: Exercise[]) => list.map((e) => e.id)
  const templates: Template[] = [
    { ...base(), name: 'Dos + Triceps', exerciseIds: [...ids(dos), ...ids(triceps)], optional: false, order: 1 },
    { ...base(), name: 'Pecs + Biceps', exerciseIds: [...ids(pecs), ...ids(biceps)], optional: false, order: 2 },
    { ...base(), name: 'Jambes', exerciseIds: ids(jambes), optional: false, order: 3 },
    { ...base(), name: 'Épaules', exerciseIds: ids(epaules), optional: true, order: 4 },
  ]
  return { exercises: [...dos, ...triceps, ...pecs, ...biceps, ...jambes, ...epaules, ...abdos], templates }
}

// Valeurs moyennes pour 100 g (ordre de grandeur des tables Ciqual)
const FOODS: [string, number, number, number, number][] = [
  ['Flocons d’avoine', 370, 13, 60, 7],
  ['Riz basmati cuit', 130, 2.7, 28, 0.3],
  ['Pâtes cuites', 150, 5.5, 30, 0.9],
  ['Pain complet', 240, 9, 41, 3.5],
  ['Pomme de terre cuite', 85, 2, 18, 0.1],
  ['Patate douce cuite', 90, 2, 20, 0.1],
  ['Quinoa cuit', 120, 4.4, 21, 1.9],
  ['Lentilles cuites', 115, 9, 16, 0.4],
  ['Pois chiches cuits', 140, 8, 19, 2.6],
  ['Blanc de poulet cuit', 160, 31, 0, 3.5],
  ['Steak haché 5 % cuit', 150, 26, 0, 5],
  ['Saumon cuit', 200, 25, 0, 11],
  ['Thon au naturel', 115, 26, 0, 1],
  ['Œuf', 140, 12.5, 0.7, 9.8],
  ['Jambon blanc', 115, 20, 1, 3.5],
  ['Tofu nature', 120, 13, 1.5, 7],
  ['Fromage blanc 0 %', 45, 7.5, 4, 0.2],
  ['Skyr nature', 60, 10.5, 4, 0.2],
  ['Yaourt nature', 60, 4, 5, 3],
  ['Lait demi-écrémé', 46, 3.3, 4.8, 1.6],
  ['Emmental', 380, 28, 0, 30],
  ['Banane', 90, 1.1, 20, 0.3],
  ['Pomme', 53, 0.3, 12, 0.2],
  ['Brocoli cuit', 30, 2.5, 3, 0.4],
  ['Haricots verts cuits', 30, 1.8, 4.5, 0.2],
  ['Avocat', 160, 2, 2, 15],
  ['Huile d’olive', 900, 0, 0, 100],
  ['Beurre de cacahuète', 600, 25, 16, 50],
  ['Amandes', 600, 21, 7, 52],
  ['Miel', 330, 0.4, 82, 0],
  ['Chocolat noir 70 %', 570, 8, 35, 42],
  ['Protéine en poudre (whey)', 380, 78, 6, 5],
]

export function seedFoods(): Food[] {
  return FOODS.map(([name, kcal, protein, carbs, fat]) => ({
    ...base(),
    name,
    brand: '',
    kcal,
    protein,
    carbs,
    fat,
    barcode: '',
    source: 'base',
  }))
}

export function seedRecipes(): Recipe[] {
  return RECIPES.map(([name, tags, protein, carbs, fat, ingredients, minutes]) => ({
    ...base(),
    name,
    tags: tags as RecipeTag[],
    // Calories déduites des macros (4 kcal/g protéines et glucides, 9 kcal/g lipides)
    kcal: Math.round(protein * 4 + carbs * 4 + fat * 9),
    protein,
    carbs,
    fat,
    ingredients,
    minutes,
    notes: '',
  }))
}

export async function seed(tx: Transaction) {
  const { exercises, templates } = seedExercises()
  await tx.table('exercises').bulkAdd(exercises)
  await tx.table('templates').bulkAdd(templates)
  await tx.table('foods').bulkAdd(seedFoods())
  await tx.table('recipes').bulkAdd(seedRecipes())
}
