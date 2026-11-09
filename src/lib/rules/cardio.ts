import type { Cardio, CardioType } from '../../db/types'
import { addDays, weekStart } from '../dates'

export function kmInWeek(acts: Cardio[], type: CardioType, monday: string): number {
  const sunday = addDays(monday, 6)
  return acts
    .filter((a) => !a.deleted && a.type === type && a.date >= monday && a.date <= sunday)
    .reduce((s, a) => s + a.distanceKm, 0)
}

export interface CardioPlan {
  thisWeek: number
  lastWeek: number
  target: number // volume conseillé pour la semaine
  remaining: number
  easy: number // sortie facile
  long: number // sortie plus longue
}

// Natation : arrondi aux 100 m ; sinon au demi-kilomètre.
const roundKm = (type: CardioType, km: number) =>
  type === 'natation' ? Math.round(km * 10) / 10 : Math.round(km * 2) / 2

export function planCardio(acts: Cardio[], type: CardioType, todayKey: string, goalKm: number): CardioPlan {
  const monday = weekStart(todayKey)
  const thisWeek = kmInWeek(acts, type, monday)
  const lastWeek = kmInWeek(acts, type, addDays(monday, -7))

  let target: number
  if (lastWeek > 0) {
    // Jamais plus de +10 % par rapport à la semaine précédente
    target = lastWeek >= goalKm ? lastWeek : Math.min(goalKm, lastWeek * 1.1)
  } else {
    const past = [1, 2, 3, 4].map((i) => kmInWeek(acts, type, addDays(monday, -7 * i)))
    const avg = past.reduce((s, x) => s + x, 0) / 4
    // Reprise : on repart de la moyenne récente, ou de la moitié de l'objectif
    target = avg > 0 ? Math.min(avg, goalKm || avg) : goalKm / 2
  }
  target = roundKm(type, target)
  const remaining = Math.max(0, roundKm(type, target - thisWeek))
  const easy = Math.min(remaining, roundKm(type, target * 0.35))
  const long = Math.min(remaining, roundKm(type, target * 0.45))
  return { thisWeek, lastWeek, target, remaining, easy, long }
}
