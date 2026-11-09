import { useState } from 'react'
import { db, remove, save, stamp } from '../../db/db'
import type { Exercise, Muscle, Template } from '../../db/types'
import { DeleteButton, Field, NumInput, Segmented, Sheet } from '../../components/ui'
import { IconDown, IconMinus, IconPlus, IconUp } from '../../components/icons'
import { MUSCLE_LABEL } from '../../lib/labels'

const MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[]

// ——— Exercices ———

export function ExercisesSheet({ exercises, onClose }: { exercises: Exercise[]; onClose: () => void }) {
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)

  if (editing) {
    return <ExerciseForm exercise={editing === 'new' ? null : editing} onDone={() => setEditing(null)} onClose={onClose} />
  }
  return (
    <Sheet title="Exercices" onClose={onClose}>
      <button type="button" className="button primary" onClick={() => setEditing('new')}>
        <IconPlus size={20} /> Nouvel exercice
      </button>
      {MUSCLES.map((m) => {
        const list = exercises.filter((e) => e.muscle === m)
        if (list.length === 0) return null
        return (
          <div key={m}>
            <h3 className="group-title">{MUSCLE_LABEL[m]}</h3>
            <ul className="row-list">
              {list.map((e) => (
                <li key={e.id}>
                  <button type="button" className="row" onClick={() => setEditing(e)}>
                    <span className="row-title">{e.name}</span>
                    <span className="muted small">
                      {e.sets} × {e.repMin}-{e.repMax}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </Sheet>
  )
}

function ExerciseForm({ exercise, onDone, onClose }: { exercise: Exercise | null; onDone: () => void; onClose: () => void }) {
  const [d, setD] = useState(() => ({
    name: exercise?.name ?? '',
    muscle: exercise?.muscle ?? ('pecs' as Muscle),
    kind: exercise?.kind ?? ('poly' as Exercise['kind']),
    repMin: exercise?.repMin ?? 6,
    repMax: exercise?.repMax ?? 10,
    sets: exercise?.sets ?? 3,
    restSec: exercise?.restSec ?? 120,
    bodyweight: exercise?.bodyweight ?? false,
  }))
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }))
  const valid = d.name.trim() && d.repMin > 0 && d.repMax >= d.repMin && d.sets > 0

  return (
    <Sheet title={exercise ? 'Modifier l’exercice' : 'Nouvel exercice'} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid) return
          const data = { ...d, name: d.name.trim() }
          if (exercise) await save(db.exercises, { ...exercise, ...data })
          else await db.exercises.put(stamp<Exercise>(data))
          onDone()
        }}
      >
        <Field label="Nom">
          <input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Groupe musculaire">
          <select className="input" value={d.muscle} onChange={(e) => set('muscle', e.target.value as Muscle)}>
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
        <Segmented
          label="Type d’exercice"
          value={d.kind}
          onChange={(k) => {
            set('kind', k)
            // Fourchettes par défaut : 6-10 polyarticulaire, 10-12 isolation
            if (!exercise) setD((x) => ({ ...x, kind: k, repMin: k === 'poly' ? 6 : 10, repMax: k === 'poly' ? 10 : 12, restSec: k === 'poly' ? 120 : 75 }))
          }}
          options={[
            { value: 'poly', label: 'Polyarticulaire' },
            { value: 'iso', label: 'Isolation' },
          ]}
        />
        <div className="grid-2">
          <Field label="Répétitions min">
            <NumInput value={d.repMin} decimals={false} onChange={(n) => set('repMin', n ?? 0)} />
          </Field>
          <Field label="Répétitions max">
            <NumInput value={d.repMax} decimals={false} onChange={(n) => set('repMax', n ?? 0)} />
          </Field>
          <Field label="Séries">
            <NumInput value={d.sets} decimals={false} onChange={(n) => set('sets', n ?? 0)} />
          </Field>
          <Field label="Repos (s)">
            <NumInput value={d.restSec} decimals={false} onChange={(n) => set('restSec', n ?? 0)} />
          </Field>
        </div>
        {d.repMax < d.repMin && <p className="error">Le maximum doit être supérieur ou égal au minimum.</p>}
        <label className="check-field">
          <input type="checkbox" checked={d.bodyweight} onChange={(e) => set('bodyweight', e.target.checked)} />
          Au poids du corps (la charge indiquée est un lest)
        </label>
        <button type="submit" className="button primary" disabled={!valid}>
          Enregistrer
        </button>
        <button type="button" className="button" onClick={onDone}>
          Annuler
        </button>
        {exercise && (
          <DeleteButton
            onConfirm={async () => {
              await remove(db.exercises, exercise.id)
              onDone()
            }}
          />
        )}
      </form>
    </Sheet>
  )
}

// ——— Séances types ———

export function TemplatesSheet({ templates, exercises, onClose }: { templates: Template[]; exercises: Exercise[]; onClose: () => void }) {
  const [editing, setEditing] = useState<Template | 'new' | null>(null)
  if (editing) {
    return (
      <TemplateForm
        template={editing === 'new' ? null : editing}
        exercises={exercises}
        nextOrder={Math.max(0, ...templates.map((t) => t.order)) + 1}
        onDone={() => setEditing(null)}
        onClose={onClose}
      />
    )
  }
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  return (
    <Sheet title="Séances types" onClose={onClose}>
      <p className="muted small">
        La séance suggérée est celle faite il y a le plus longtemps. Les séances « en option » ne sont proposées que s’il reste du temps.
      </p>
      <button type="button" className="button primary" onClick={() => setEditing('new')}>
        <IconPlus size={20} /> Nouvelle séance type
      </button>
      <ul className="row-list">
        {templates.map((t) => (
          <li key={t.id}>
            <button type="button" className="row" onClick={() => setEditing(t)}>
              <span>
                <span className="row-title">
                  {t.name} {t.optional && <span className="tag">option</span>}
                </span>
                <span className="muted small">
                  {t.exerciseIds
                    .map((id) => names.get(id))
                    .filter(Boolean)
                    .join(', ') || 'Aucun exercice'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function TemplateForm({
  template,
  exercises,
  nextOrder,
  onDone,
  onClose,
}: {
  template: Template | null
  exercises: Exercise[]
  nextOrder: number
  onDone: () => void
  onClose: () => void
}) {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const [name, setName] = useState(template?.name ?? '')
  const [optional, setOptional] = useState(template?.optional ?? false)
  const [ids, setIds] = useState<string[]>(() => (template?.exerciseIds ?? []).filter((id) => byId.has(id)))
  const available = exercises.filter((e) => !ids.includes(e.id) && e.muscle !== 'abdos')

  const move = (i: number, delta: number) =>
    setIds((list) => {
      const next = [...list]
      const [x] = next.splice(i, 1)
      next.splice(i + delta, 0, x)
      return next
    })

  return (
    <Sheet title={template ? 'Modifier la séance type' : 'Nouvelle séance type'} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          const data = { name: name.trim(), optional, exerciseIds: ids }
          if (template) await save(db.templates, { ...template, ...data })
          else await db.templates.put(stamp<Template>({ ...data, order: nextOrder }))
          onDone()
        }}
      >
        <Field label="Nom">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <label className="check-field">
          <input type="checkbox" checked={optional} onChange={(e) => setOptional(e.target.checked)} />
          En option (proposée seulement s’il reste du temps)
        </label>
        <p className="muted small">Un exercice d’abdos est ajouté automatiquement à chaque séance.</p>
        <ol className="row-list">
          {ids.map((id, i) => (
            <li key={id} className="row static">
              <span className="row-title">{byId.get(id)?.name}</span>
              <span className="row-actions">
                <button type="button" className="icon-button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter">
                  <IconUp />
                </button>
                <button type="button" className="icon-button" disabled={i === ids.length - 1} onClick={() => move(i, 1)} aria-label="Descendre">
                  <IconDown />
                </button>
                <button type="button" className="icon-button" onClick={() => setIds((l) => l.filter((x) => x !== id))} aria-label="Retirer">
                  <IconMinus />
                </button>
              </span>
            </li>
          ))}
        </ol>
        {available.length > 0 && (
          <Field label="Ajouter un exercice">
            <select
              className="input"
              value=""
              onChange={(e) => {
                if (e.target.value) setIds((l) => [...l, e.target.value])
              }}
            >
              <option value="">Choisir…</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({MUSCLE_LABEL[e.muscle]})
                </option>
              ))}
            </select>
          </Field>
        )}
        <button type="submit" className="button primary" disabled={!name.trim()}>
          Enregistrer
        </button>
        <button type="button" className="button" onClick={onDone}>
          Annuler
        </button>
        {template && (
          <DeleteButton
            onConfirm={async () => {
              await remove(db.templates, template.id)
              onDone()
            }}
          />
        )}
      </form>
    </Sheet>
  )
}
