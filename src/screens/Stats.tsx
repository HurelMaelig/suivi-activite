import { useState } from 'react'
import { useCardio, useMeals, useMeasures, useWorkouts } from '../db/hooks'
import type { Cardio, CardioType, Measure, Workout } from '../db/types'
import { Empty, SectionHead, Segmented } from '../components/ui'
import { BarChart, LineChart } from '../components/charts'
import { WeightHistorySheet, WeightSheet } from '../components/WeightSheet'
import { IconPlus } from '../components/icons'
import { addDays, formatShort, fromKey, monthStart, today, weekStart, yearStart } from '../lib/dates'
import { fmt0, fmt1, fmtKg, formatPace } from '../lib/format'
import { usePref } from '../lib/prefs'
import { CARDIO_LABEL } from '../lib/labels'
import { distanceText } from './Cardio'

const PERIODS = ['jour', 'semaine', 'mois', 'annee'] as const
type Period = (typeof PERIODS)[number]
const PERIOD_LABEL: Record<Period, string> = { jour: 'Jour', semaine: 'Semaine', mois: 'Mois', annee: 'Année' }

function periodStart(p: Period, key: string) {
  return p === 'jour' ? key : p === 'semaine' ? weekStart(key) : p === 'mois' ? monthStart(key) : yearStart(key)
}

export function Stats() {
  const [period, setPeriod] = usePref<Period>('statsPeriod', PERIODS, 'semaine')
  const workouts = useWorkouts()
  const cardio = useCardio()
  const meals = useMeals()
  const measures = useMeasures()
  const [weightSheet, setWeightSheet] = useState<'new' | 'history' | null>(null)
  if (!workouts || !cardio || !meals || !measures) return null

  const key = today()
  const start = periodStart(period, key)
  const done = workouts.filter((w) => w.finished)
  const gym = done.filter((w) => w.date >= start && w.date <= key)
  const runs = cardio.filter((c) => c.date >= start && c.date <= key)
  const minutes = gym.reduce((s, w) => s + w.durationMin, 0) + runs.reduce((s, c) => s + c.durationMin, 0)
  const km = runs.filter((c) => c.type !== 'natation').reduce((s, c) => s + c.distanceKm, 0)

  // Calories moyennes : seulement sur les jours où des repas sont notés
  const byDay = new Map<string, number>()
  for (const m of meals) if (m.date >= start && m.date <= key) byDay.set(m.date, (byDay.get(m.date) ?? 0) + m.kcal)
  const avgKcal = byDay.size ? [...byDay.values()].reduce((a, b) => a + b, 0) / byDay.size : null

  const monday = weekStart(key)
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(monday, -7 * (11 - i)))

  const weightDays = period === 'annee' ? 365 : period === 'mois' ? 90 : 30
  const weightFrom = addDays(key, -weightDays)
  const weights = measures.filter((m) => m.date >= weightFrom)

  return (
    <>
      <Segmented label="Période" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))} />

      <section className="stat-grid two" aria-label="Totaux de la période">
        <Tile label="Séances salle" value={fmt0(gym.length)} />
        <Tile label="Sorties cardio" value={fmt0(runs.length)} />
        <Tile label="Heures d’activité" value={fmt1(minutes / 60)} />
        <Tile label="Km course + vélo" value={fmt1(km)} />
        <Tile label="Calories moyennes" value={avgKcal === null ? '—' : fmt0(avgKcal)} hint={byDay.size ? `sur ${byDay.size} jour${byDay.size > 1 ? 's notés' : ' noté'}` : 'aucun repas noté'} />
        <Tile label="Dernier poids" value={measures.length ? fmtKg(measures.at(-1)!.weightKg) : '—'} />
      </section>

      <section className="card">
        <h2>Minutes d’activité par semaine</h2>
        <BarChart
          ariaLabel="Minutes d’activité sur les 12 dernières semaines, salle et cardio"
          unit="min"
          data={weeks.map((w) => {
            const end = addDays(w, 6)
            const inWeek = <T extends { date: string }>(x: T) => x.date >= w && x.date <= end
            return {
              label: `${fromKey(w).getDate()}/${fromKey(w).getMonth() + 1}`,
              parts: [
                { value: done.filter(inWeek).reduce((s, x) => s + x.durationMin, 0), tone: 'green' as const },
                { value: cardio.filter(inWeek).reduce((s, x) => s + x.durationMin, 0), tone: 'orange' as const },
              ],
            }
          })}
        />
        <p className="legend">
          <span className="dot-label gym" aria-hidden="true" /> Salle
          <span className="dot-label cardio" aria-hidden="true" /> Cardio
          <span className="muted small">· semaines commençant le lundi indiqué</span>
        </p>
      </section>

      <section className="card">
        <SectionHead
          title="Poids"
          action={
            <button type="button" className="button small-btn" onClick={() => setWeightSheet('new')}>
              <IconPlus size={20} /> Pesée
            </button>
          }
        />
        {weights.length === 0 ? (
          <Empty>Aucune pesée sur les {weightDays} derniers jours.</Empty>
        ) : (
          <LineChart
            ariaLabel={`Courbe de poids sur ${weightDays} jours`}
            unit="kg"
            points={weights.map((m) => ({ x: fromKey(m.date).getTime(), y: m.weightKg, label: formatShort(m.date) }))}
          />
        )}
        {measures.length > 0 && (
          <button type="button" className="button" onClick={() => setWeightSheet('history')}>
            Toutes les pesées ({measures.length})
          </button>
        )}
      </section>

      <Records workouts={done} cardio={cardio} />

      {weightSheet === 'new' && <WeightSheet measure={null} onClose={() => setWeightSheet(null)} />}
      {weightSheet === 'history' && <WeightHistorySheet measures={measures as Measure[]} onClose={() => setWeightSheet(null)} />}
    </>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

function Records({ workouts, cardio }: { workouts: Workout[]; cardio: Cardio[] }) {
  // Meilleure charge par exercice, et 1RM estimé (formule d'Epley : charge × (1 + rép / 30))
  const best = new Map<string, { name: string; weight: number; reps: number; date: string; oneRm: number }>()
  for (const w of workouts) {
    for (const e of w.entries) {
      for (const s of e.sets) {
        if (!s.done || s.reps <= 0 || s.weight <= 0) continue
        const oneRm = s.weight * (1 + s.reps / 30)
        const cur = best.get(e.exerciseId)
        if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
          best.set(e.exerciseId, { name: e.name, weight: s.weight, reps: s.reps, date: w.date, oneRm: Math.max(oneRm, cur?.oneRm ?? 0) })
        } else if (oneRm > cur.oneRm) cur.oneRm = oneRm
      }
    }
  }
  const lifts = [...best.values()].sort((a, b) => a.name.localeCompare(b.name))

  const types: CardioType[] = ['course', 'velo', 'natation']
  const longest = types
    .map((t) => cardio.filter((c) => c.type === t).sort((a, b) => b.distanceKm - a.distanceKm)[0])
    .filter((c): c is Cardio => !!c)
  const fastRun = cardio
    .filter((c) => c.type === 'course' && c.distanceKm >= 5 && c.durationMin > 0)
    .sort((a, b) => a.durationMin / a.distanceKm - b.durationMin / b.distanceKm)[0]

  return (
    <section className="card">
      <h2>Records personnels</h2>
      {lifts.length === 0 && longest.length === 0 && <Empty>Tes records apparaîtront après tes premières séances.</Empty>}
      {lifts.length > 0 && (
        <ul className="status-list">
          {lifts.map((l) => (
            <li key={l.name}>
              <span>{l.name}</span>
              <span className="record">
                {fmtKg(l.weight)} × {l.reps}
                <span className="muted small"> · 1RM ≈ {fmt0(l.oneRm)} kg</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {longest.length > 0 && (
        <ul className="status-list">
          {longest.map((c) => (
            <li key={c.id}>
              <span>{CARDIO_LABEL[c.type]} la plus longue</span>
              <span className="record">
                {distanceText(c)} <span className="muted small">· {formatShort(c.date)}</span>
              </span>
            </li>
          ))}
          {fastRun && (
            <li>
              <span>Meilleure allure (5 km et plus)</span>
              <span className="record">
                {formatPace(fastRun.durationMin / fastRun.distanceKm)} /km <span className="muted small">· {formatShort(fastRun.date)}</span>
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
