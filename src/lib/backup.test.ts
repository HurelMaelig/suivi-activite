import 'fake-indexeddb/auto' // base IndexedDB simulée, pour tester hors navigateur
import { describe, expect, it } from 'vitest'
import { db, remove, save, stamp } from '../db/db'
import type { Measure } from '../db/types'
import { exportData, importData } from './backup'

const later = (iso: string) => new Date(Date.parse(iso) + 60_000).toISOString()

describe('sauvegarde JSON', () => {
  it('crée les données de départ à la première ouverture', async () => {
    expect(await db.exercises.count()).toBeGreaterThan(20)
    expect(await db.templates.count()).toBe(4)
    expect(await db.recipes.count()).toBeGreaterThanOrEqual(40)
  })

  it('fusionne en gardant la version la plus récente, sans effacer', async () => {
    const m = stamp<Measure>({ date: '2026-11-01', weightKg: 78 })
    await db.measures.put(m)
    const gone = stamp<Measure>({ date: '2026-10-01', weightKg: 79 })
    await db.measures.put(gone)
    const backup = JSON.parse(await (await exportData()).text())

    // Après l'export : modification et suppression locales, plus récentes que la sauvegarde
    await new Promise((r) => setTimeout(r, 5))
    await save(db.measures, { ...m, weightKg: 80 })
    await remove(db.measures, gone.id)

    const r1 = await importData(JSON.stringify(backup))
    expect(r1.added).toBe(0)
    expect((await db.measures.get(m.id))?.weightKg).toBe(80) // la version locale, plus récente, gagne
    expect((await db.measures.get(gone.id))?.deleted).toBe(true) // la suppression n'est pas annulée

    // Une version plus récente dans le fichier remplace la version locale
    const row = backup.tables.measures.find((x: Measure) => x.id === m.id)
    row.weightKg = 77.5
    row.updated_at = later((await db.measures.get(m.id))!.updated_at)
    const r2 = await importData(JSON.stringify(backup))
    expect(r2.updated).toBe(1)
    expect((await db.measures.get(m.id))?.weightKg).toBe(77.5)
  })

  it('restaure tout dans une base vide', async () => {
    const text = await (await exportData()).text()
    const total = (await Promise.all(db.tables.map((t) => t.count()))).reduce((a, b) => a + b, 0)
    await Promise.all(db.tables.map((t) => t.clear()))
    const r = await importData(text)
    expect(r.added).toBe(total)
    expect(await db.exercises.count()).toBeGreaterThan(20)
  })

  it('refuse un fichier qui ne vient pas de l’app', async () => {
    await expect(importData('pas du json')).rejects.toThrow('JSON valide')
    await expect(importData('{"app":"autre"}')).rejects.toThrow('cette application')
  })
})
