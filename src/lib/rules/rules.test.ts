import { describe, expect, it } from 'vitest'
import type { Cardio, Exercise, Recipe, Template, Workout, WorkSet } from '../../db/types'
import { seedExercises, seedRecipes } from '../../db/seed'
import { isScheduledDeload, suggestLoad, type ExerciseSession } from './progression'
import { pickAbs, pickTemplate, planSession } from './workout'
import { planCardio } from './cardio'
import { activityFactor, bmr, nutritionTargets } from './nutrition'
import { isExcluded, suggestRecipes } from './meals'

const meta = { updated_at: '', deleted: false }

const exo = (over: Partial<Exercise> = {}): Exercise => ({
  ...meta,
  id: 'x',
  name: 'Développé couché',
  muscle: 'pecs',
  kind: 'poly',
  repMin: 6,
  repMax: 10,
  sets: 3,
  restSec: 120,
  bodyweight: false,
  ...over,
})

const sets = (weight: number, ...reps: number[]): WorkSet[] => reps.map((r) => ({ reps: r, weight, done: true }))
const session = (date: string, weight: number, ...reps: number[]): ExerciseSession => ({ date, sets: sets(weight, ...reps) })

const workout = (over: Partial<Workout>): Workout => ({
  ...meta,
  id: crypto.randomUUID(),
  date: '2026-11-01',
  startedAt: '2026-11-01T10:00:00Z',
  templateId: null,
  name: '',
  durationMin: 60,
  entries: [],
  feeling: null,
  finished: true,
  ...over,
})

describe('double progression', () => {
  it('ajoute 2,5 kg en haut du corps quand toutes les séries atteignent le haut', () => {
    const s = suggestLoad(exo(), [session('2026-11-01', 60, 10, 10, 10)], false)
    expect(s.weight).toBe(62.5)
    expect(s.kind).toBe('hausse')
  })

  it('ajoute 5 kg pour les jambes', () => {
    const s = suggestLoad(exo({ muscle: 'jambes' }), [session('2026-11-01', 100, 10, 10, 10)], false)
    expect(s.weight).toBe(105)
  })

  it('garde la charge si une série est sous le haut de fourchette', () => {
    const s = suggestLoad(exo(), [session('2026-11-01', 60, 10, 10, 8)], false)
    expect(s.weight).toBe(60)
    expect(s.kind).toBe('maintien')
  })

  it('garde la charge avec un message dédié si le bas est manqué 2 fois', () => {
    const s = suggestLoad(exo(), [session('2026-11-01', 60, 7, 6, 5), session('2026-11-04', 60, 6, 5, 5)], false)
    expect(s.weight).toBe(60)
    expect(s.reason).toContain('2 fois')
  })

  it('propose -10 % après 3 séances sans progrès', () => {
    const h = [
      session('2026-10-01', 80, 8, 8, 7),
      session('2026-10-04', 80, 8, 7, 7),
      session('2026-10-08', 80, 8, 7, 7),
      session('2026-10-11', 80, 7, 7, 7),
    ]
    const s = suggestLoad(exo(), h, false)
    expect(s.kind).toBe('allegee')
    expect(s.weight).toBe(72)
  })

  it('ne propose pas d’allègement si une séance a progressé', () => {
    const h = [
      session('2026-10-01', 80, 8, 8, 7),
      session('2026-10-04', 80, 8, 8, 8),
      session('2026-10-08', 80, 8, 8, 8),
      session('2026-10-11', 80, 8, 8, 8),
    ]
    expect(suggestLoad(exo(), h, false).kind).toBe('maintien')
  })

  it('sans historique, ne propose pas de charge', () => {
    expect(suggestLoad(exo(), [], false).weight).toBeNull()
  })

  it('semaine allégée prévue toutes les 6 semaines', () => {
    const w = [workout({ date: '2026-01-05' })]
    expect(isScheduledDeload(w, '2026-02-09')).toBe(true) // 6e semaine
    expect(isScheduledDeload(w, '2026-02-02')).toBe(false) // 5e semaine
  })
})

describe('séance suggérée', () => {
  const { exercises, templates } = seedExercises()

  it('choisit une séance jamais faite, puis la plus ancienne', () => {
    expect(pickTemplate(templates, [])?.name).toBe('Dos + Triceps')
    const done = [
      workout({ templateId: templates[0].id, date: '2026-11-05' }),
      workout({ templateId: templates[1].id, date: '2026-11-03' }),
      workout({ templateId: templates[2].id, date: '2026-11-04' }),
    ]
    expect(pickTemplate(templates, done)?.name).toBe('Pecs + Biceps')
  })

  it('ne propose jamais la séance optionnelle Épaules en premier', () => {
    const t: Template[] = templates.map((x) => (x.optional ? x : { ...x, deleted: true }))
    expect(pickTemplate(t, [])).toBeNull()
  })

  it('garde dos et triceps même en 45 min, et ajoute des épaules à 75 min', () => {
    const dosTri = templates[0]
    const short = planSession(dosTri, templates, exercises, [], 45)
    expect(new Set(short.main.map((e) => e.muscle))).toEqual(new Set(['dos', 'triceps']))
    expect(short.extra).toHaveLength(0)
    expect(short.minutes).toBeLessThanOrEqual(50)

    const long = planSession(dosTri, templates, exercises, [], 75)
    expect(long.main.length).toBeGreaterThan(short.main.length)
    const legs = planSession(templates[2], templates, exercises, [], 75)
    expect(legs.abs?.muscle).toBe('abdos')
    expect(legs.minutes).toBeLessThanOrEqual(80)
  })

  it('change d’exercice d’abdos à chaque séance', () => {
    const first = pickAbs(exercises, [])!
    const w = workout({ entries: [{ exerciseId: first.id, name: first.name, sets: [] }] })
    const next = pickAbs(exercises, [w])!
    expect(next.id).not.toBe(first.id)
    expect(next.muscle).toBe('abdos')
  })
})

describe('cardio', () => {
  const run = (date: string, km: number): Cardio => ({
    ...meta,
    id: crypto.randomUUID(),
    date,
    type: 'course',
    distanceKm: km,
    durationMin: km * 6,
    avgHr: null,
    source: 'manuelle',
    notes: '',
  })

  it('limite le volume à +10 % par rapport à la semaine précédente', () => {
    // Lundi 2 novembre 2026 ; semaine précédente : 20 km
    const p = planCardio([run('2026-10-27', 10), run('2026-10-31', 10)], 'course', '2026-11-04', 40)
    expect(p.lastWeek).toBe(20)
    expect(p.target).toBe(22)
    expect(p.long).toBeLessThanOrEqual(p.remaining)
  })

  it('ne dépasse pas l’objectif', () => {
    const p = planCardio([run('2026-10-27', 14)], 'course', '2026-11-04', 15)
    expect(p.target).toBe(15)
  })

  it('repart de la moitié de l’objectif sans historique', () => {
    expect(planCardio([], 'course', '2026-11-04', 20).target).toBe(10)
  })
})

describe('nutrition', () => {
  const profile = { heightCm: 180, birthYear: 1996, sex: 'homme' as const, goal: 'maintien' as const, excluded: [] }

  it('calcule Mifflin-St Jeor', () => {
    expect(bmr(80, 180, 30, 'homme')).toBe(1780)
    expect(bmr(60, 165, 30, 'femme')).toBeCloseTo(1320.25)
  })

  it('utilise un facteur par défaut avec moins d’une semaine d’historique', () => {
    expect(activityFactor(500, 1780, 3)).toEqual({ factor: 1.375, estimated: false })
    expect(activityFactor(356, 1780, 28).factor).toBe(1.4)
  })

  it('sèche : déficit plafonné, protéines et lipides minimaux respectés', () => {
    const t = nutritionTargets(80, { ...profile, goal: 'seche' }, 30, 1.4)
    expect(t.tdee - t.kcal).toBeLessThanOrEqual(Math.round(t.tdee * 0.2))
    expect(t.tdee - t.kcal).toBeGreaterThanOrEqual(300)
    expect(t.protein).toBeGreaterThanOrEqual(128)
    expect(t.fat).toBeGreaterThanOrEqual(64)
    expect(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal)).toBeLessThan(15)
  })

  it('prise : +250 kcal', () => {
    const t = nutritionTargets(80, { ...profile, goal: 'prise' }, 30, 1.4)
    expect(t.kcal - t.tdee).toBe(250)
  })
})

describe('idées de repas', () => {
  const recipes = seedRecipes()

  it('a environ 40 recettes cohérentes', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(40)
    for (const r of recipes) expect(r.kcal).toBeGreaterThan(50)
  })

  it('respecte les aliments exclus, au mot près', () => {
    const r = { name: 'Chili', ingredients: ['poivron', 'œufs'] } as Recipe
    expect(isExcluded(r, ['pois'])).toBe(false)
    expect(isExcluded(r, ['oeuf'])).toBe(true)
    expect(isExcluded(r, ['Œufs'])).toBe(true)
  })

  it('propose 3 dîners proches des calories et protéines restantes, sans aliment exclu', () => {
    const out = suggestRecipes(recipes, { kcal: 600, protein: 40 }, 'diner', ['saumon'])
    expect(out).toHaveLength(3)
    for (const r of out) {
      expect(r.tags).toContain('diner')
      expect(isExcluded(r, ['saumon'])).toBe(false)
      expect(Math.abs(r.kcal - 600)).toBeLessThan(200)
    }
  })
})
