import type { Table } from 'dexie'
import type Dexie from 'dexie'
import { TABLES, type TableName } from '../db/db'
import type { Base } from '../db/types'

// Synchronisation « hors ligne d'abord » : l'app écrit toujours en local,
// puis envoie ses changements et récupère ceux des autres appareils.
// En cas de conflit, la modification la plus récente (updated_at) gagne.

export interface RemoteRow {
  id: string
  collection: string
  data: Base
  updated_at: string
  deleted: boolean
  server_updated_at: string
}

export type OutgoingRow = Omit<RemoteRow, 'server_updated_at'>

// Ce que le serveur doit savoir faire (Supabase en vrai, une imitation dans les tests)
export interface Remote {
  push(rows: OutgoingRow[]): Promise<void>
  pull(since: string, limit: number): Promise<RemoteRow[]>
  isEmpty(): Promise<boolean>
}

export interface Cursor {
  lastPush: string // date locale du dernier envoi réussi
  lastPull: string // date serveur des dernières nouveautés récupérées
}

const PUSH_BATCH = 500
const PULL_PAGE = 1000
// Marge de recouvrement : rattrape une ligne écrite sur le serveur juste pendant la récupération
const OVERLAP_MS = 2 * 60_000

// Vrai pendant qu'on applique des données venues du serveur : ces écritures ne déclenchent pas de nouvel envoi.
export let applyingRemote = false

const USER_DATA: TableName[] = ['workouts', 'cardio', 'meals', 'measures', 'steps', 'settings']

const table = (db: Dexie, name: TableName) => db.table(name) as Table<Base, string>

// Appareil « neuf » : rien saisi, seulement les données de départ.
export async function isPristine(db: Dexie): Promise<boolean> {
  for (const name of USER_DATA) if ((await table(db, name).count()) > 0) return false
  return true
}

async function pushChanges(db: Dexie, remote: Remote, since: string): Promise<number> {
  let sent = 0
  for (const name of TABLES) {
    const t = table(db, name)
    const rows = since ? await t.where('updated_at').above(since).toArray() : await t.toArray()
    for (let i = 0; i < rows.length; i += PUSH_BATCH) {
      const batch = rows.slice(i, i + PUSH_BATCH).map((r) => ({
        id: r.id,
        collection: name,
        data: r,
        updated_at: r.updated_at,
        deleted: !!r.deleted,
      }))
      await remote.push(batch)
      sent += batch.length
    }
  }
  return sent
}

export async function applyRemote(db: Dexie, rows: RemoteRow[]): Promise<number> {
  let applied = 0
  const known = new Set<string>(TABLES)
  const tables = TABLES.map((n) => db.table(n))
  applyingRemote = true
  try {
    await db.transaction('rw', tables, async () => {
      for (const row of rows) {
        if (!known.has(row.collection)) continue // collection d'une version plus récente de l'app
        const t = table(db, row.collection as TableName)
        const local = await t.get(row.id)
        if (!local || row.updated_at > local.updated_at) {
          await t.put({ ...row.data, id: row.id, updated_at: row.updated_at, deleted: row.deleted })
          applied++
        }
      }
    })
  } finally {
    applyingRemote = false
  }
  return applied
}

async function pullChanges(db: Dexie, remote: Remote, since: string): Promise<{ applied: number; newest: string }> {
  let cursor = since
  let newest = since
  let applied = 0
  for (;;) {
    const page = await remote.pull(cursor, PULL_PAGE)
    if (page.length === 0) break
    applied += await applyRemote(db, page)
    cursor = page[page.length - 1].server_updated_at
    if (cursor > newest) newest = cursor
    if (page.length < PULL_PAGE) break
  }
  return { applied, newest }
}

export interface SyncResult {
  cursor: Cursor
  pushed: number
  pulled: number
  replacedLocal: boolean
}

export async function syncOnce(db: Dexie, remote: Remote, previous: Cursor | null): Promise<SyncResult> {
  let replacedLocal = false
  // Premier passage de ce compte sur cet appareil : sur un appareil neuf, on ne garde pas les
  // données de départ (elles feraient doublon avec celles du compte), on récupère celles du serveur.
  if (!previous && (await isPristine(db)) && !(await remote.isEmpty())) {
    applyingRemote = true
    try {
      await db.transaction('rw', TABLES.map((n) => db.table(n)), async () => {
        for (const name of TABLES) await table(db, name).clear()
      })
    } finally {
      applyingRemote = false
    }
    replacedLocal = true
  }

  const cursor: Cursor = previous ?? { lastPush: '', lastPull: '' }
  const startedAt = new Date().toISOString()
  const pushed = replacedLocal ? 0 : await pushChanges(db, remote, cursor.lastPush)
  const { applied, newest } = await pullChanges(db, remote, cursor.lastPull)

  const lastPull = newest ? new Date(Date.parse(newest) - OVERLAP_MS).toISOString() : cursor.lastPull
  return {
    cursor: { lastPush: startedAt, lastPull: lastPull > cursor.lastPull ? lastPull : cursor.lastPull },
    pushed,
    pulled: applied,
    replacedLocal,
  }
}
