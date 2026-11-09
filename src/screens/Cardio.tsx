import { useState } from 'react'
import { db, remove, save, stamp } from '../db/db'
import { useCardio, useSettings } from '../db/hooks'
import type { Cardio as CardioRow, CardioType } from '../db/types'
import { DeleteButton, Empty, Field, NumInput, Progress, SectionHead, Segmented, Sheet } from '../components/ui'
import { BarChart } from '../components/charts'
import { IconPlus } from '../components/icons'
import { addDays, formatRelative, formatShort, fromKey, today, weekStart, yearStart } from '../lib/dates'
import { durationText, fmt0, fmt1, formatDurationSec, formatPace, parseDuration } from '../lib/format'
import { kmInWeek, planCardio } from '../lib/rules/cardio'
import { usePref } from '../lib/prefs'
import { CARDIO_LABEL } from '../lib/labels'

const TYPES = ['course', 'velo', 'natation'] as const

// Allure (course), vitesse (vélo) ou allure aux 100 m (natation)
export function speedText(c: Pick<CardioRow, 'type' | 'distanceKm' | 'durationMin'>): string {
  if (c.distanceKm <= 0 || c.durationMin <= 0) return '—'
  if (c.type === 'course') return `${formatPace(c.durationMin / c.distanceKm)} /km`
  if (c.type === 'velo') return `${fmt1(c.distanceKm / (c.durationMin / 60))} km/h`
  return `${formatPace(c.durationMin / (c.distanceKm * 10))} /100 m`
}

export const distanceText = (c: Pick<CardioRow, 'type' | 'distanceKm'>) =>
  c.type === 'natation' ? `${fmt0(c.distanceKm * 1000)} m` : `${fmt1(c.distanceKm)} km`

const kmText = (type: CardioType, km: number) => (type === 'natation' ? `${fmt0(km * 1000)} m` : `${fmt1(km)} km`)

export function Cardio() {
  const [type, setType] = usePref<CardioType>('cardioType', TYPES, 'course')
  const acts = useCardio()
  const settings = useSettings()
  const [editing, setEditing] = useState<CardioRow | 'new' | null>(null)
  if (!acts || !settings) return null

  const key = today()
  const list = acts.filter((a) => a.type === type)
  const last = list[0]
  const plan = planCardio(acts, type, key, settings.goals.weeklyKm[type])
  const monday = weekStart(key)
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(monday, -7 * (7 - i)))
  const yearKm = list.filter((a) => a.date >= yearStart(key)).reduce((s, a) => s + a.distanceKm, 0)
  const yearGoal = settings.goals.yearlyKm[type]

  return (
    <>
      <Segmented label="Type d’activité" value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: CARDIO_LABEL[t] }))} />

      <section className="card">
        <h2>Dernière sortie</h2>
        {last ? (
          <>
            <p className="muted small">
              {formatRelative(last.date)}
              {last.source !== 'manuelle' ? ` · ${last.source}` : ''}
            </p>
            <div className="metrics">
              <div>
                <span className="stat-label">Distance</span>
                <span className="metric">{distanceText(last)}</span>
              </div>
              <div>
                <span className="stat-label">Durée</span>
                <span className="metric">{formatDurationSec(last.durationMin)}</span>
              </div>
              <div>
                <span className="stat-label">{type === 'velo' ? 'Vitesse' : 'Allure'}</span>
                <span className="metric">{speedText(last)}</span>
              </div>
              <div>
                <span className="stat-label">FC moy.</span>
                <span className="metric">{last.avgHr ? `${last.avgHr} bpm` : '—'}</span>
              </div>
            </div>
          </>
        ) : (
          <Empty>Aucune sortie de {CARDIO_LABEL[type].toLowerCase()} pour l’instant.</Empty>
        )}
        <button type="button" className="button primary" onClick={() => setEditing('new')}>
          <IconPlus size={20} /> Ajouter une sortie
        </button>
      </section>

      <section className="card">
        <h2>Cette semaine</h2>
        <Progress
          label="Volume conseillé"
          tone="orange"
          value={plan.thisWeek}
          max={plan.target}
          detail={`${kmText(type, plan.thisWeek)} / ${kmText(type, plan.target)}`}
        />
        {plan.remaining > 0 ? (
          <ul className="plain-list">
            <li>
              Sortie facile : <strong>{kmText(type, plan.easy)}</strong>, à allure confortable
            </li>
            <li>
              Sortie plus longue : <strong>{kmText(type, plan.long)}</strong>
            </li>
          </ul>
        ) : (
          <p className="ok">Volume de la semaine atteint. Récupère bien.</p>
        )}
        <p className="muted small">
          Semaine précédente : {kmText(type, plan.lastWeek)}. Le volume conseillé ne dépasse jamais +10 % d’une semaine à l’autre, jusqu’à ton objectif de{' '}
          {kmText(type, settings.goals.weeklyKm[type])}.
        </p>
      </section>

      <section className="card">
        <h2>{type === 'natation' ? 'Mètres' : 'Kilomètres'} par semaine</h2>
        <BarChart
          ariaLabel={`Distance de ${CARDIO_LABEL[type].toLowerCase()} sur les 8 dernières semaines`}
          unit={type === 'natation' ? 'm' : 'km'}
          data={weeks.map((w) => {
            const km = kmInWeek(acts, type, w)
            return { label: formatShort(w).replace(/\.$/, ''), parts: [{ value: type === 'natation' ? km * 1000 : km, tone: 'orange' as const }] }
          })}
        />
        {yearGoal > 0 && (
          <Progress
            label={`Objectif ${fromKey(key).getFullYear()}`}
            tone="orange"
            value={yearKm}
            max={yearGoal}
            detail={`${kmText(type, yearKm)} / ${kmText(type, yearGoal)}`}
          />
        )}
      </section>

      <section className="card">
        <SectionHead title="Historique" />
        {list.length === 0 && <Empty>Tes sorties apparaîtront ici.</Empty>}
        <ul className="row-list">
          {list.slice(0, 40).map((a) => (
            <li key={a.id}>
              <button type="button" className="row" onClick={() => setEditing(a)}>
                <span>
                  <span className="row-title">
                    {distanceText(a)} · {formatDurationSec(a.durationMin)}
                  </span>
                  <span className="muted small">
                    {formatShort(a.date)} · {speedText(a)}
                    {a.avgHr ? ` · ${a.avgHr} bpm` : ''}
                  </span>
                </span>
                <span className="muted small">Modifier</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {editing && <CardioSheet activity={editing === 'new' ? null : editing} type={type} onClose={() => setEditing(null)} />}
    </>
  )
}

function CardioSheet({ activity, type, onClose }: { activity: CardioRow | null; type: CardioType; onClose: () => void }) {
  const t = activity?.type ?? type
  const swim = t === 'natation'
  const [date, setDate] = useState(activity?.date ?? today())
  const [distance, setDistance] = useState<number | null>(activity ? (swim ? activity.distanceKm * 1000 : activity.distanceKm) : null)
  const [duration, setDuration] = useState(activity ? durationText(activity.durationMin) : '')
  const [hr, setHr] = useState<number | null>(activity?.avgHr ?? null)
  const [notes, setNotes] = useState(activity?.notes ?? '')

  const minutes = parseDuration(duration)
  const km = distance === null ? NaN : swim ? distance / 1000 : distance
  const valid = km > 0 && minutes > 0 && !!date

  return (
    <Sheet title={`${activity ? 'Modifier' : 'Nouvelle sortie'} · ${CARDIO_LABEL[t]}`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid) return
          const data = { date, type: t, distanceKm: km, durationMin: minutes, avgHr: hr ? Math.round(hr) : null, notes: notes.trim() }
          if (activity) await save(db.cardio, { ...activity, ...data })
          else await db.cardio.put(stamp<CardioRow>({ ...data, source: 'manuelle' }))
          onClose()
        }}
      >
        <Field label="Date">
          <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <div className="grid-2">
          <Field label={swim ? 'Distance (m)' : 'Distance (km)'}>
            <NumInput value={distance} onChange={setDistance} decimals={!swim} placeholder={swim ? '1500' : '10'} />
          </Field>
          <Field label="Durée" hint="45, 45:30 ou 1:05:30">
            <input className="input" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45:00" />
          </Field>
        </div>
        {valid && <p className="muted small">{speedText({ type: t, distanceKm: km, durationMin: minutes })}</p>}
        {duration && !(minutes > 0) && <p className="error">Durée non reconnue.</p>}
        <Field label="Fréquence cardiaque moyenne (facultatif)">
          <NumInput value={hr} onChange={setHr} decimals={false} placeholder="145" />
        </Field>
        <Field label="Notes (facultatif)">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <button type="submit" className="button primary" disabled={!valid}>
          Enregistrer
        </button>
        {activity && (
          <DeleteButton
            onConfirm={async () => {
              await remove(db.cardio, activity.id)
              onClose()
            }}
          />
        )}
      </form>
    </Sheet>
  )
}
