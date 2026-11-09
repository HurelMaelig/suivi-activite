import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { AppDB, stamp } from '../db/db'
import type { Measure, Workout } from '../db/types'
import { syncOnce, type Cursor, type OutgoingRow, type Remote, type RemoteRow } from './engine'

// Imitation du serveur Supabase : même règle que la fonction SQL push_records.
class FakeServer implements Remote {
  rows = new Map<string, RemoteRow>()
  private clock = 0
  private stamp() {
    this.clock += 1
    return new Date(Date.UTC(2026, 0, 1) + this.clock * 1000).toISOString()
  }
  async push(rows: OutgoingRow[]) {
    for (const r of rows) {
      const cur = this.rows.get(r.id)
      if (!cur || cur.updated_at < r.updated_at) this.rows.set(r.id, { ...structuredClone(r), server_updated_at: this.stamp() })
    }
  }
  async pull(since: string, limit: number) {
    return [...this.rows.values()]
      .filter((r) => r.server_updated_at > since)
      .sort((a, b) => (a.server_updated_at < b.server_updated_at ? -1 : 1))
      .slice(0, limit)
      .map((r) => structuredClone(r))
  }
  async isEmpty() {
    return this.rows.size === 0
  }
}

let n = 0
const device = async () => {
  const db = new AppDB(`appareil-${++n}`)
  await db.open()
  return { db, cursor: null as Cursor | null }
}
const sync = async (d: { db: AppDB; cursor: Cursor | null }, server: FakeServer) => {
  const r = await syncOnce(d.db, server, d.cursor)
  d.cursor = r.cursor
  return r
}
const tick = () => new Promise((r) => setTimeout(r, 5))

describe('synchronisation', () => {
  it('envoie tout au premier passage, puis seulement les changements', async () => {
    const server = new FakeServer()
    const phone = await device()
    await phone.db.measures.put(stamp<Measure>({ date: '2026-11-01', weightKg: 78 }))
    const first = await sync(phone, server)
    expect(first.pushed).toBeGreaterThan(70) // données de départ + la pesée
    expect(server.rows.size).toBe(first.pushed)

    await tick()
    await phone.db.measures.put(stamp<Measure>({ date: '2026-11-02', weightKg: 77.8 }))
    const second = await sync(phone, server)
    expect(second.pushed).toBe(1)
  })

  it('un appareil neuf récupère les données du compte sans doublons', async () => {
    const server = new FakeServer()
    const phone = await device()
    await phone.db.measures.put(stamp<Measure>({ date: '2026-11-01', weightKg: 78 }))
    await sync(phone, server)

    const tablet = await device()
    const r = await sync(tablet, server)
    expect(r.replacedLocal).toBe(true)
    expect(await tablet.db.exercises.count()).toBe(await phone.db.exercises.count())
    expect(await tablet.db.recipes.count()).toBe(await phone.db.recipes.count())
    expect((await tablet.db.measures.toArray())[0].weightKg).toBe(78)
  })

  it('la modification la plus récente gagne, et les suppressions se propagent', async () => {
    const server = new FakeServer()
    const phone = await device()
    const w = stamp<Measure>({ date: '2026-11-01', weightKg: 78 })
    await phone.db.measures.put(w)
    await sync(phone, server)
    const tablet = await device()
    await sync(tablet, server)

    // Hors ligne : la tablette modifie, puis le téléphone modifie plus tard
    await tick()
    await tablet.db.measures.put({ ...w, weightKg: 79, updated_at: new Date().toISOString() })
    await tick()
    await phone.db.measures.put({ ...w, weightKg: 80, updated_at: new Date().toISOString() })

    await sync(phone, server) // le plus récent arrive en premier
    await sync(tablet, server) // l'ancienne version de la tablette est refusée, puis remplacée
    await sync(phone, server)
    expect((await tablet.db.measures.get(w.id))?.weightKg).toBe(80)
    expect((await phone.db.measures.get(w.id))?.weightKg).toBe(80)

    await tick()
    await phone.db.measures.put({ ...w, weightKg: 80, deleted: true, updated_at: new Date().toISOString() })
    await sync(phone, server)
    await sync(tablet, server)
    expect((await tablet.db.measures.get(w.id))?.deleted).toBe(true)
  })

  it('garde les données d’un appareil déjà utilisé et les fusionne', async () => {
    const server = new FakeServer()
    const phone = await device()
    await phone.db.measures.put(stamp<Measure>({ date: '2026-11-01', weightKg: 78 }))
    await sync(phone, server)

    const used = await device()
    await used.db.workouts.put(
      stamp<Workout>({
        date: '2026-11-03',
        startedAt: '2026-11-03T08:00:00Z',
        templateId: null,
        name: 'Séance libre',
        durationMin: 30,
        entries: [],
        feeling: null,
        finished: true,
      }),
    )
    const r = await sync(used, server)
    expect(r.replacedLocal).toBe(false)
    expect(await used.db.workouts.count()).toBe(1)
    expect(await used.db.measures.count()).toBe(1)
    await sync(phone, server)
    expect(await phone.db.workouts.count()).toBe(1)
  })
})
