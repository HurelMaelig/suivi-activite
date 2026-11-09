import { describe, expect, it } from 'vitest'
import { durationText, formatDurationSec, formatPace, parseDuration, parseNum } from './format'
import { addDays, weekStart } from './dates'

describe('saisie et affichage', () => {
  it('lit les nombres avec une virgule', () => {
    expect(parseNum('62,5')).toBe(62.5)
    expect(parseNum(' 1 500 ')).toBe(1500)
    expect(parseNum('abc')).toBeNaN()
  })

  it('lit les durées', () => {
    expect(parseDuration('45')).toBe(45)
    expect(parseDuration('52:30')).toBe(52.5)
    expect(parseDuration('1:05:30')).toBe(65.5)
    expect(parseDuration('1h05')).toBe(65)
    expect(parseDuration('1h')).toBe(60)
    expect(parseDuration('vite')).toBeNaN()
    expect(parseDuration('')).toBeNaN()
  })

  it('réaffiche une durée pour la modifier', () => {
    expect(durationText(52.5)).toBe('52:30')
    expect(durationText(65.5)).toBe('1:05:30')
    expect(durationText(45)).toBe('45')
  })

  it('affiche durées et allures', () => {
    expect(formatDurationSec(52.5)).toBe('52 min 30 s')
    expect(formatDurationSec(45)).toBe('45 min')
    expect(formatPace(52.5 / 10.2)).toBe('5:09')
    expect(formatPace(4.999)).toBe('5:00')
  })

  it('calcule les semaines du lundi au dimanche', () => {
    expect(weekStart('2026-11-09')).toBe('2026-11-09') // lundi
    expect(weekStart('2026-11-15')).toBe('2026-11-09') // dimanche
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30') // passage à l'heure d'été
  })
})

describe('recherche Open Food Facts', async () => {
  const { rankByName } = await import('./off')
  const p = (name: string, brand = '') => ({ code: name, name, brand, kcal: 1, protein: 0, carbs: 0, fat: 0 })

  it('remonte les produits dont le nom correspond', () => {
    const out = rankByName([p('Fromage Blanc Nature'), p('Skyr nature 0%', 'Yoplait'), p('Gervais'), p('Skyr vanille')], 'skyr')
    expect(out.map((x) => x.name)).toEqual(['Skyr nature 0%', 'Skyr vanille', 'Fromage Blanc Nature', 'Gervais'])
  })

  it('préfère les produits qui ont tous les mots', () => {
    const out = rankByName([p('Skyr vanille'), p('Skyr nature'), p('Yaourt nature')], 'skyr nature')
    expect(out[0].name).toBe('Skyr nature')
  })
})
