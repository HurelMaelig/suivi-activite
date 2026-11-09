import type { Table } from 'dexie'
import { db, TABLES, type TableName } from '../db/db'
import type { Base } from '../db/types'
import { today } from './dates'

interface BackupFile {
  app: 'suivi-activite'
  version: 1
  exportedAt: string
  tables: Partial<Record<TableName, Base[]>>
}

const table = (name: TableName) => db.table(name) as Table<Base, string>

// Tout, y compris les lignes supprimées : utile pour fusionner sans faire revenir une suppression.
export async function exportData(): Promise<Blob> {
  const tables: BackupFile['tables'] = {}
  for (const name of TABLES) tables[name] = await table(name).toArray()
  const file: BackupFile = { app: 'suivi-activite', version: 1, exportedAt: new Date().toISOString(), tables }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
}

export const backupFileName = () => `suivi-activite-${today()}.json`

// Sur iPhone, le menu de partage permet « Enregistrer dans Fichiers ».
export async function shareOrDownload(blob: Blob, name: string): Promise<'partage' | 'telechargement' | 'annule'> {
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return 'partage'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'annule'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'telechargement'
}

export interface ImportResult {
  added: number
  updated: number
  skipped: number
}

const isRow = (r: unknown): r is Base =>
  !!r && typeof r === 'object' && typeof (r as Base).id === 'string' && typeof (r as Base).updated_at === 'string'

// Fusion : pour chaque ligne, la version la plus récente gagne.
export async function importData(text: string): Promise<ImportResult> {
  let data: BackupFile
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Ce fichier n’est pas un JSON valide.')
  }
  if (data?.app !== 'suivi-activite' || !data.tables) throw new Error('Ce fichier ne vient pas de cette application.')

  const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
  await db.transaction('rw', TABLES.map((n) => db.table(n)), async () => {
    for (const name of TABLES) {
      const rows = data.tables[name]
      if (!Array.isArray(rows)) continue
      const t = table(name)
      for (const row of rows) {
        if (!isRow(row)) {
          result.skipped++
          continue
        }
        const existing = await t.get(row.id)
        if (!existing) {
          await t.put({ ...row, deleted: !!row.deleted })
          result.added++
        } else if (row.updated_at > existing.updated_at) {
          await t.put(row)
          result.updated++
        } else {
          result.skipped++
        }
      }
    }
  })
  return result
}
