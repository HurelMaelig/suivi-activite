import { useState } from 'react'
import { alive, db, remove, save, stamp } from '../db/db'
import type { Measure } from '../db/types'
import { DeleteButton, Field, NumInput, Sheet } from './ui'
import { formatShort, today } from '../lib/dates'
import { fmtKg } from '../lib/format'

// Ajout ou modification d'une pesée. Une seule pesée par jour : la nouvelle remplace l'ancienne.
export function WeightSheet({ measure, onClose }: { measure: Measure | null; onClose: () => void }) {
  const [date, setDate] = useState(measure?.date ?? today())
  const [kg, setKg] = useState<number | null>(measure?.weightKg ?? null)
  const valid = !!date && kg !== null && kg >= 25 && kg <= 300

  return (
    <Sheet title={measure ? 'Modifier la pesée' : 'Nouvelle pesée'} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid) return
          const weightKg = Math.round(kg! * 10) / 10
          if (measure) {
            await save(db.measures, { ...measure, date, weightKg })
          } else {
            const sameDay = alive(await db.measures.where('date').equals(date).toArray())[0]
            if (sameDay) await save(db.measures, { ...sameDay, weightKg })
            else await db.measures.put(stamp<Measure>({ date, weightKg }))
          }
          onClose()
        }}
      >
        <div className="grid-2">
          <Field label="Date">
            <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Poids (kg)">
            <NumInput value={kg} onChange={setKg} placeholder="75,0" />
          </Field>
        </div>
        {kg !== null && !valid && <p className="error">Poids attendu entre 25 et 300 kg.</p>}
        <button type="submit" className="button primary" disabled={!valid}>
          Enregistrer
        </button>
        {measure && (
          <DeleteButton
            onConfirm={async () => {
              await remove(db.measures, measure.id)
              onClose()
            }}
          />
        )}
      </form>
    </Sheet>
  )
}

export function WeightHistorySheet({ measures, onClose }: { measures: Measure[]; onClose: () => void }) {
  const [editing, setEditing] = useState<Measure | null>(null)
  if (editing) return <WeightSheet measure={editing} onClose={() => setEditing(null)} />
  return (
    <Sheet title="Pesées" onClose={onClose}>
      <ul className="row-list">
        {[...measures].reverse().map((m) => (
          <li key={m.id}>
            <button type="button" className="row" onClick={() => setEditing(m)}>
              <span className="row-title">{fmtKg(m.weightKg)}</span>
              <span className="muted small">{formatShort(m.date)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
