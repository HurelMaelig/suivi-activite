import { useEffect, useState } from 'react'
import { db, remove, save } from '../db/db'
import { useExercises, useTemplates, useWorkouts } from '../db/hooks'
import type { Exercise, Feeling, Template, Workout, WorkoutEntry } from '../db/types'
import { DeleteButton, Empty, Field, NumInput, SectionHead, Segmented, Sheet } from '../components/ui'
import { IconCheck, IconMinus, IconPlay, IconPlus, IconTimer } from '../components/icons'
import { formatRelative, formatShort, today } from '../lib/dates'
import { fmt0, fmtKg, formatDuration, formatTimer } from '../lib/format'
import { exerciseHistory, isScheduledDeload, suggestLoad } from '../lib/rules/progression'
import { planSession } from '../lib/rules/workout'
import { entryFor, startSession } from '../lib/session'
import { MINUTES, useAvailableMinutes } from '../lib/prefs'
import { ExercisesSheet, TemplatesSheet } from './salle/Manage'
import { MUSCLE_LABEL } from '../lib/labels'

export const FEELINGS: { value: Feeling; label: string }[] = [
  { value: 'facile', label: 'Facile' },
  { value: 'correct', label: 'Correct' },
  { value: 'dur', label: 'Dur' },
]

export function Salle() {
  const workouts = useWorkouts()
  const templates = useTemplates()
  const exercises = useExercises()
  if (!workouts || !templates || !exercises) return null

  const active = workouts.find((w) => !w.finished)
  if (active) return <ActiveSession key={active.id} workout={active} workouts={workouts} exercises={exercises} />
  return <SalleHome workouts={workouts} templates={templates} exercises={exercises} />
}

// ——— Accueil de l'onglet : choix de séance, historique, gestion ———

function SalleHome({ workouts, templates, exercises }: { workouts: Workout[]; templates: Template[]; exercises: Exercise[] }) {
  const [minutes, setMinutes] = useAvailableMinutes()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Workout | null>(null)
  const [manage, setManage] = useState<'exercises' | 'templates' | null>(null)
  const done = workouts.filter((w) => w.finished)

  const start = async (t: Template | null) => {
    setBusy(true)
    if (!t) {
      await startSession('Séance libre', null, [], workouts)
      return
    }
    const plan = planSession(t, templates, exercises, workouts, Number(minutes))
    await startSession(t.name, t.id, [...plan.main, ...plan.extra, ...(plan.abs ? [plan.abs] : [])], workouts)
  }

  return (
    <>
      <section className="card">
        <h2>Choisir une séance</h2>
        <Segmented
          label="Temps disponible"
          value={minutes}
          onChange={setMinutes}
          options={MINUTES.map((m) => ({ value: m, label: `${m} min` }))}
        />
        <ul className="choice-list">
          {templates.map((t) => {
            const last = done.find((w) => w.templateId === t.id)
            const plan = planSession(t, templates, exercises, workouts, Number(minutes))
            const count = plan.main.length + plan.extra.length + (plan.abs ? 1 : 0)
            return (
              <li key={t.id}>
                <div>
                  <p className="choice-name">
                    {t.name} {t.optional && <span className="tag">option</span>}
                  </p>
                  <p className="muted small">
                    {count} exercices · ≈ {plan.minutes} min · {last ? formatRelative(last.date) : 'jamais faite'}
                  </p>
                </div>
                <button type="button" className="button primary small-btn" onClick={() => start(t)} disabled={busy} aria-label={`Démarrer ${t.name}`}>
                  <IconPlay />
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className="button" onClick={() => start(null)} disabled={busy}>
          Séance libre
        </button>
      </section>

      <section className="card">
        <SectionHead title="Historique" />
        {done.length === 0 && <Empty>Tes séances terminées apparaîtront ici.</Empty>}
        <ul className="row-list">
          {done.slice(0, 30).map((w) => {
            const sets = w.entries.reduce((n, e) => n + e.sets.length, 0)
            return (
              <li key={w.id}>
                <button type="button" className="row" onClick={() => setEditing(w)}>
                  <span>
                    <span className="row-title">{w.name}</span>
                    <span className="muted small">
                      {formatShort(w.date)} · {formatDuration(w.durationMin)} · {sets} séries
                    </span>
                  </span>
                  <span className="muted small">Modifier</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card">
        <h2>Gérer</h2>
        <div className="button-row">
          <button type="button" className="button" onClick={() => setManage('exercises')}>
            Exercices
          </button>
          <button type="button" className="button" onClick={() => setManage('templates')}>
            Séances types
          </button>
        </div>
      </section>

      {editing && <WorkoutSheet workout={editing} onClose={() => setEditing(null)} />}
      {manage === 'exercises' && <ExercisesSheet exercises={exercises} onClose={() => setManage(null)} />}
      {manage === 'templates' && <TemplatesSheet templates={templates} exercises={exercises} onClose={() => setManage(null)} />}
    </>
  )
}

// ——— Séance en cours ———

const REST_KEY = 'restEnd'

function readRestEnd(): number | null {
  try {
    const v = Number(localStorage.getItem(REST_KEY))
    return v > Date.now() - 60_000 ? v : null
  } catch {
    return null
  }
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

function ActiveSession({ workout, workouts, exercises }: { workout: Workout; workouts: Workout[]; exercises: Exercise[] }) {
  const now = useNow(500)
  const [restEnd, setRestEndState] = useState<number | null>(readRestEnd)
  const [adding, setAdding] = useState(false)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const deload = isScheduledDeload(workouts, today())

  const setRestEnd = (v: number | null) => {
    setRestEndState(v)
    try {
      if (v) localStorage.setItem(REST_KEY, String(v))
      else localStorage.removeItem(REST_KEY)
    } catch {
      // sans stockage, le minuteur marche jusqu'au changement d'écran
    }
  }

  const restLeft = restEnd ? (restEnd - now) / 1000 : null
  useEffect(() => {
    if (restLeft !== null && restLeft <= 0 && restLeft > -0.6) navigator.vibrate?.(400)
  }, [restLeft])

  // Relit la version enregistrée avant chaque modification : deux saisies rapides ne s'écrasent pas.
  const update = (fn: (w: Workout) => void) =>
    db.transaction('rw', db.workouts, async () => {
      const current = await db.workouts.get(workout.id)
      if (!current) return
      fn(current)
      await save(db.workouts, current)
    })
  const setEntry = (i: number, fn: (e: WorkoutEntry) => void) => update((w) => fn(w.entries[i]))

  const elapsedMin = (now - Date.parse(workout.startedAt)) / 60_000
  const doneSets = workout.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  const finish = async () => {
    const next = structuredClone(workout)
    next.entries = next.entries
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0)
    next.durationMin = Math.max(1, Math.round(elapsedMin))
    next.finished = true
    setRestEnd(null)
    await save(db.workouts, next)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <section className="card highlight">
        <div className="card-title">
          <h2>{workout.name}</h2>
          <span className="muted">{formatTimer(elapsedMin * 60)}</span>
        </div>
        <p className="muted small">
          {doneSets} séries validées. Touche la coche après chaque série pour lancer le repos.
        </p>
      </section>

      {restLeft !== null && (
        <div className={`rest-banner ${restLeft <= 0 ? 'over' : ''}`} role="timer" aria-live="polite">
          <IconTimer />
          <span className="rest-time">{restLeft > 0 ? formatTimer(restLeft) : 'Repos terminé'}</span>
          {restLeft > 0 && (
            <>
              <button type="button" className="button small-btn" onClick={() => setRestEnd(restEnd! - 15_000)} aria-label="Retirer 15 secondes">
                −15
              </button>
              <button type="button" className="button small-btn" onClick={() => setRestEnd(restEnd! + 15_000)} aria-label="Ajouter 15 secondes">
                +15
              </button>
            </>
          )}
          <button type="button" className="button small-btn" onClick={() => setRestEnd(null)}>
            {restLeft > 0 ? 'Passer' : 'OK'}
          </button>
        </div>
      )}

      {workout.entries.map((entry, i) => {
        const ex = byId.get(entry.exerciseId)
        const tip = ex ? suggestLoad(ex, exerciseHistory(workouts, ex.id), deload) : null
        return (
          <section className="card" key={entry.exerciseId + i}>
            <div className="card-title">
              <h2>{entry.name}</h2>
              {ex?.muscle === 'abdos' && <span className="tag">abdos</span>}
            </div>
            {tip && (
              <p className={`tip ${tip.kind}`}>
                {ex!.sets} × {tip.reps}
                {tip.weight !== null && !ex!.bodyweight ? ` · ${fmtKg(tip.weight)}` : ''} — {tip.reason}
              </p>
            )}
            <div className="sets" role="table" aria-label={`Séries de ${entry.name}`}>
              <div className="sets-head" role="row">
                <span role="columnheader">Série</span>
                <span role="columnheader">Rép.</span>
                <span role="columnheader">{ex?.bodyweight ? 'Lest kg' : 'kg'}</span>
                <span role="columnheader">
                  <span className="sr-only">Validée</span>
                </span>
              </div>
              {entry.sets.map((s, j) => (
                <div className={`set-row ${s.done ? 'done' : ''}`} role="row" key={j}>
                  <span role="cell" className="set-index">
                    {j + 1}
                  </span>
                  <span role="cell">
                    <NumInput
                      value={s.reps}
                      decimals={false}
                      ariaLabel={`Répétitions série ${j + 1}`}
                      onChange={(n) => setEntry(i, (e) => (e.sets[j].reps = n ?? 0))}
                    />
                  </span>
                  <span role="cell">
                    <NumInput
                      value={s.weight}
                      ariaLabel={`Charge série ${j + 1}`}
                      onChange={(n) =>
                        setEntry(i, (e) => {
                          // La nouvelle charge suit sur les séries suivantes pas encore faites
                          const old = e.sets[j].weight
                          const v = n ?? 0
                          e.sets[j].weight = v
                          for (let k = j + 1; k < e.sets.length; k++) if (!e.sets[k].done && e.sets[k].weight === old) e.sets[k].weight = v
                        })
                      }
                    />
                  </span>
                  <span role="cell">
                    <button
                      type="button"
                      className={`check ${s.done ? 'on' : ''}`}
                      aria-pressed={s.done}
                      aria-label={`Série ${j + 1} faite`}
                      onClick={() => {
                        const doneNow = !s.done
                        setEntry(i, (e) => (e.sets[j].done = doneNow))
                        if (doneNow) setRestEnd(Date.now() + (ex?.restSec ?? 90) * 1000)
                      }}
                    >
                      <IconCheck />
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button"
                onClick={() =>
                  setEntry(i, (e) => {
                    const last = e.sets.at(-1)
                    e.sets.push({ reps: last?.reps ?? 0, weight: last?.weight ?? 0, done: false })
                  })
                }
              >
                <IconPlus size={20} /> Série
              </button>
              <button
                type="button"
                className="button"
                disabled={entry.sets.length <= 1}
                onClick={() => setEntry(i, (e) => void e.sets.pop())}
              >
                <IconMinus /> Série
              </button>
              <button type="button" className="button ghost-danger" onClick={() => update((w) => void w.entries.splice(i, 1))}>
                Retirer
              </button>
            </div>
          </section>
        )
      })}

      <button type="button" className="button" onClick={() => setAdding(true)}>
        <IconPlus size={20} /> Ajouter un exercice
      </button>

      <section className="card">
        <h2>Ressenti</h2>
        <Segmented<Feeling>
          label="Ressenti de la séance"
          value={workout.feeling ?? 'correct'}
          onChange={(f) => update((w) => (w.feeling = f))}
          options={FEELINGS}
        />
        <button type="button" className="button primary" onClick={finish}>
          Terminer la séance
        </button>
        {doneSets === 0 && <p className="muted small">Aucune série validée : la séance sera enregistrée vide.</p>}
        <DeleteButton label="Abandonner la séance" onConfirm={() => remove(db.workouts, workout.id).then(() => setRestEnd(null))} />
      </section>

      {adding && (
        <Sheet title="Ajouter un exercice" onClose={() => setAdding(false)}>
          <ul className="row-list">
            {exercises.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="row"
                  onClick={() => {
                    update((w) => void w.entries.push(entryFor(e, workouts)))
                    setAdding(false)
                  }}
                >
                  <span className="row-title">{e.name}</span>
                  <span className="muted small">{MUSCLE_LABEL[e.muscle]}</span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  )
}


// ——— Modifier une séance passée ———

function WorkoutSheet({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const [draft, setDraft] = useState<Workout>(() => structuredClone(workout))
  const edit = (fn: (w: Workout) => void) =>
    setDraft((d) => {
      const n = structuredClone(d)
      fn(n)
      return n
    })
  const volume = draft.entries.reduce((s, e) => s + e.sets.reduce((t, x) => t + x.reps * x.weight, 0), 0)

  return (
    <Sheet title={workout.name} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          await save(db.workouts, draft)
          onClose()
        }}
      >
        <div className="grid-2">
          <Field label="Date">
            <input className="input" type="date" value={draft.date} max={today()} onChange={(e) => edit((w) => (w.date = e.target.value))} required />
          </Field>
          <Field label="Durée (min)">
            <NumInput value={draft.durationMin} decimals={false} onChange={(n) => edit((w) => (w.durationMin = n ?? 0))} />
          </Field>
        </div>
        <Segmented<Feeling> label="Ressenti" value={draft.feeling ?? 'correct'} onChange={(f) => edit((w) => (w.feeling = f))} options={FEELINGS} />
        <p className="muted small">Volume total : {fmt0(volume)} kg</p>
        {draft.entries.map((en, i) => (
          <fieldset className="fieldset" key={i}>
            <legend>{en.name}</legend>
            {en.sets.map((s, j) => (
              <div className="set-row edit" key={j}>
                <span className="set-index">{j + 1}</span>
                <NumInput value={s.reps} decimals={false} ariaLabel={`Répétitions série ${j + 1}`} onChange={(n) => edit((w) => (w.entries[i].sets[j].reps = n ?? 0))} />
                <NumInput value={s.weight} ariaLabel={`Charge série ${j + 1}`} onChange={(n) => edit((w) => (w.entries[i].sets[j].weight = n ?? 0))} />
                <button type="button" className="icon-button" aria-label={`Supprimer la série ${j + 1}`} onClick={() => edit((w) => void w.entries[i].sets.splice(j, 1))}>
                  <IconMinus />
                </button>
              </div>
            ))}
          </fieldset>
        ))}
        <button type="submit" className="button primary">
          Enregistrer
        </button>
        <DeleteButton
          label="Supprimer la séance"
          onConfirm={async () => {
            await remove(db.workouts, workout.id)
            onClose()
          }}
        />
      </form>
    </Sheet>
  )
}
