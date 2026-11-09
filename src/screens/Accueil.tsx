import { useState } from 'react'
import { db, save, stamp } from '../db/db'
import {
  useCardio,
  useExercises,
  useMealsOn,
  useNutrition,
  useSettings,
  useSteps,
  useTemplates,
  useWorkouts,
} from '../db/hooks'
import type { Cardio, Steps, Workout } from '../db/types'
import { Field, NumInput, Progress, Segmented, Sheet } from '../components/ui'
import { IconPlay } from '../components/icons'
import { addDays, formatLong, today, weekStart } from '../lib/dates'
import { fmt0, fmt1, formatDuration, formatDurationSec } from '../lib/format'
import { cardioKcal, stepsKcal, workoutKcal } from '../lib/rules/energy'
import { pickTemplate, planSession } from '../lib/rules/workout'
import { startSession } from '../lib/session'
import { MINUTES, useAvailableMinutes, useOnline } from '../lib/prefs'
import { CARDIO_LABEL } from '../lib/labels'
import { useSync } from '../sync'
import { syncLabel } from '../components/SyncCard'


export function Accueil() {
  const key = today()
  const workouts = useWorkouts()
  const cardio = useCardio()
  const steps = useSteps()
  const settings = useSettings()
  const nutrition = useNutrition()
  const meals = useMealsOn(key)
  const [editSteps, setEditSteps] = useState(false)

  if (!workouts || !cardio || !steps || !settings || !nutrition || !meals) return null

  const weight = nutrition.weight ?? 75
  const doneToday = workouts.filter((w) => w.finished && w.date === key)
  const cardioToday = cardio.filter((c) => c.date === key)
  const stepsToday = steps.find((s) => s.date === key)
  const minutes = doneToday.reduce((s, w) => s + w.durationMin, 0) + cardioToday.reduce((s, c) => s + c.durationMin, 0)
  const kcal =
    doneToday.reduce((s, w) => s + workoutKcal(w, weight), 0) +
    cardioToday.reduce((s, c) => s + cardioKcal(c, weight), 0) +
    (stepsToday ? stepsKcal(stepsToday.count, weight) : 0)

  const eaten = meals.reduce(
    (t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein }),
    { kcal: 0, protein: 0 },
  )

  return (
    <>
      <p className="date">{formatLong(key)}</p>

      <section className="stat-grid" aria-label="Aujourd’hui">
        <div className="card stat">
          <span className="stat-label">Minutes</span>
          <span className="stat-value">{fmt0(minutes)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Calories</span>
          <span className="stat-value">{fmt0(kcal)}</span>
        </div>
        <button type="button" className="card stat stat-button" onClick={() => setEditSteps(true)}>
          <span className="stat-label">Pas</span>
          <span className="stat-value">{stepsToday ? fmt0(stepsToday.count) : '—'}</span>
          <span className="stat-hint">{stepsToday ? `objectif ${fmt0(settings.goals.stepsPerDay)}` : 'Saisir'}</span>
        </button>
      </section>
      {!nutrition.weight && minutes > 0 && (
        <p className="note">Calories estimées pour 75 kg : ajoute ton poids dans Réglages.</p>
      )}

      <TodayCard workouts={doneToday} cardio={cardioToday} />
      <WeekCard workouts={workouts} cardio={cardio} gymGoal={settings.goals.gymPerWeek} cardioGoal={settings.goals.cardioPerWeek} />
      <SuggestionCard workouts={workouts} />

      <section className="card">
        <div className="card-title">
          <h2>Repas</h2>
          <a href="#repas" className="link">
            Détails
          </a>
        </div>
        {nutrition.targets ? (
          <>
            <Progress
              label="Calories"
              value={eaten.kcal}
              max={nutrition.targets.kcal}
              detail={`${fmt0(eaten.kcal)} / ${fmt0(nutrition.targets.kcal)} kcal`}
            />
            <Progress
              label="Protéines"
              value={eaten.protein}
              max={nutrition.targets.protein}
              detail={`${fmt0(eaten.protein)} / ${fmt0(nutrition.targets.protein)} g`}
            />
          </>
        ) : (
          <p className="muted">
            {fmt0(eaten.kcal)} kcal, {fmt0(eaten.protein)} g de protéines aujourd’hui. Ajoute ton poids dans{' '}
            <a href="#reglages" className="link">
              Réglages
            </a>{' '}
            pour voir tes objectifs.
          </p>
        )}
      </section>

      <ServicesCard />

      {editSteps && <StepsSheet date={key} current={stepsToday} onClose={() => setEditSteps(false)} />}
    </>
  )
}

function TodayCard({ workouts, cardio }: { workouts: Workout[]; cardio: Cardio[] }) {
  return (
    <section className="card">
      <h2>Séance du jour</h2>
      {workouts.length === 0 && cardio.length === 0 && <p className="muted">Rien d’enregistré pour l’instant.</p>}
      <ul className="plain-list">
        {workouts.map((w) => (
          <li key={w.id}>
            <span className="dot-label gym" aria-hidden="true" />
            {w.name} · {formatDuration(w.durationMin)}
          </li>
        ))}
        {cardio.map((c) => (
          <li key={c.id}>
            <span className="dot-label cardio" aria-hidden="true" />
            {CARDIO_LABEL[c.type]} · {fmt1(c.distanceKm)} km · {formatDurationSec(c.durationMin)}
          </li>
        ))}
      </ul>
    </section>
  )
}

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function WeekCard({
  workouts,
  cardio,
  gymGoal,
  cardioGoal,
}: {
  workouts: Workout[]
  cardio: Cardio[]
  gymGoal: number
  cardioGoal: number
}) {
  const key = today()
  const monday = weekStart(key)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const gymDays = new Set(workouts.filter((w) => w.finished && w.date >= monday).map((w) => w.date))
  const cardioDays = new Set(cardio.filter((c) => c.date >= monday).map((c) => c.date))
  const gymCount = workouts.filter((w) => w.finished && w.date >= monday && w.date <= days[6]).length
  const cardioCount = cardio.filter((c) => c.date >= monday && c.date <= days[6]).length

  return (
    <section className="card">
      <div className="card-title">
        <h2>Objectif de la semaine</h2>
      </div>
      <p className="muted">
        Salle {gymCount} / {gymGoal} · Cardio {cardioCount} / {cardioGoal}
      </p>
      <ol className="week">
        {days.map((d, i) => {
          const gym = gymDays.has(d)
          const car = cardioDays.has(d)
          const kind = gym && car ? 'both' : gym ? 'gym' : car ? 'cardio' : 'none'
          const what = gym && car ? 'salle et cardio' : gym ? 'salle' : car ? 'cardio' : 'repos'
          return (
            <li key={d} aria-label={`${DAY_NAMES[i]} : ${what}${d === key ? ', aujourd’hui' : ''}`}>
              <span className={`week-dot ${kind} ${d === key ? 'today' : ''}`} aria-hidden="true" />
              <span className="week-letter" aria-hidden="true">
                {DAY_LETTERS[i]}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="legend">
        <span className="dot-label gym" aria-hidden="true" /> Salle
        <span className="dot-label cardio" aria-hidden="true" /> Cardio
        <span className="dot-label today" aria-hidden="true" /> Aujourd’hui
      </p>
    </section>
  )
}

function SuggestionCard({ workouts }: { workouts: Workout[] }) {
  const templates = useTemplates()
  const exercises = useExercises()
  const [minutes, setMinutes] = useAvailableMinutes()
  const [busy, setBusy] = useState(false)
  if (!templates || !exercises) return null

  const active = workouts.find((w) => !w.finished)
  if (active) {
    return (
      <section className="card highlight">
        <h2>Séance en cours</h2>
        <p>{active.name}</p>
        <a href="#salle" className="button primary">
          <IconPlay /> Reprendre
        </a>
      </section>
    )
  }

  const template = pickTemplate(templates, workouts)
  if (!template) {
    return (
      <section className="card">
        <h2>Séance suggérée</h2>
        <p className="muted">Crée une séance type dans l’onglet Salle pour recevoir des suggestions.</p>
      </section>
    )
  }
  const plan = planSession(template, templates, exercises, workouts, Number(minutes))
  const list = [...plan.main, ...plan.extra, ...(plan.abs ? [plan.abs] : [])]

  const start = async () => {
    setBusy(true)
    await startSession(template.name, template.id, list, workouts)
    location.hash = 'salle'
  }

  return (
    <section className="card highlight">
      <div className="card-title">
        <h2>Séance suggérée</h2>
        <span className="muted">≈ {plan.minutes} min</span>
      </div>
      <p className="suggest-name">{template.name}</p>
      <Segmented
        label="Temps disponible"
        value={minutes}
        onChange={setMinutes}
        options={MINUTES.map((m) => ({ value: m, label: `${m} min` }))}
      />
      <ul className="plain-list compact">
        {plan.main.map((e) => (
          <li key={e.id}>{e.name}</li>
        ))}
        {plan.extra.map((e) => (
          <li key={e.id}>
            {e.name} <span className="tag">bonus</span>
          </li>
        ))}
        {plan.abs && (
          <li>
            {plan.abs.name} <span className="tag">abdos</span>
          </li>
        )}
      </ul>
      <button type="button" className="button primary" onClick={start} disabled={busy}>
        <IconPlay /> Démarrer
      </button>
    </section>
  )
}

function ServicesCard() {
  const online = useOnline()
  const state = useSync()
  const sync = syncLabel(state)
  return (
    <section className="card">
      <h2>Connexions</h2>
      <ul className="status-list">
        <li>
          <span>Réseau</span>
          <span className={online ? 'ok' : 'muted'}>{online ? 'En ligne' : 'Hors ligne'}</span>
        </li>
        <li>
          <span>Synchronisation</span>
          <a href="#reglages" className={sync.tone === 'error' ? 'error' : sync.tone}>
            {sync.text}
          </a>
        </li>
        <li>
          <span>Strava (Garmin)</span>
          <span className="muted">Phase 3</span>
        </li>
        <li>
          <span>Pas automatiques</span>
          <span className="muted">Phase 3</span>
        </li>
      </ul>
      {state.status === 'error' && state.error && <p className="note">{state.error}</p>}
      <p className="muted small">
        {state.email ? 'Tes données sont sur cet appareil et sauvegardées en ligne.' : 'Tes données sont enregistrées sur cet appareil.'}
      </p>
    </section>
  )
}

function StepsSheet({ date, current, onClose }: { date: string; current: Steps | undefined; onClose: () => void }) {
  const [count, setCount] = useState<number | null>(current?.count ?? null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (count === null) return
    const value = Math.round(count)
    if (current) await save<Steps>(db.steps, { ...current, count: value, source: 'manuel' })
    else await db.steps.put(stamp<Steps>({ date, count: value, source: 'manuel' }))
    onClose()
  }
  return (
    <Sheet title="Pas du jour" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nombre de pas" hint="Lis le total sur ta montre ou dans l’app Santé.">
          <NumInput value={count} onChange={setCount} decimals={false} placeholder="8000" ariaLabel="Nombre de pas" />
        </Field>
        <button type="submit" className="button primary" disabled={count === null}>
          Enregistrer
        </button>
      </form>
    </Sheet>
  )
}
