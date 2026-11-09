// Dates au format AAAA-MM-JJ, toujours en heure locale (jamais en UTC, sinon
// une saisie à 23 h tomberait le lendemain).

export function toKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): string {
  return toKey(new Date())
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

// Lundi de la semaine de cette date
export function weekStart(key: string): string {
  const d = fromKey(key)
  const offset = (d.getDay() + 6) % 7
  return addDays(key, -offset)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)
}

export function monthStart(key: string): string {
  return key.slice(0, 8) + '01'
}

export function yearStart(key: string): string {
  return key.slice(0, 5) + '01-01'
}

const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export function formatLong(key: string): string {
  const s = fmtLong.format(fromKey(key))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatShort(key: string): string {
  return fmtShort.format(fromKey(key))
}

// « à l'instant », « il y a 5 min », « il y a 2 h », sinon la date
export function formatAgo(iso: string, now = Date.now()): string {
  const min = Math.floor((now - Date.parse(iso)) / 60_000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  if (min < 24 * 60) return `il y a ${Math.floor(min / 60)} h`
  return `le ${formatShort(toKey(new Date(iso)))}`
}

export function formatRelative(key: string): string {
  const diff = daysBetween(key, today())
  if (diff === 0) return 'aujourd’hui'
  if (diff === 1) return 'hier'
  if (diff > 1 && diff < 7) return `il y a ${diff} jours`
  return `le ${formatShort(key)}`
}
