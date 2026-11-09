const num = (digits: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

const n0 = num(0)
const n1 = num(1)
const n2 = num(2)

export const fmt0 = (n: number) => n0.format(n)
export const fmt1 = (n: number) => n1.format(n)
export const fmtKg = (n: number) => `${n2.format(n)} kg`

// Accepte « 12,5 » comme « 12.5 » (clavier français de l'iPhone)
export function parseNum(text: string): number {
  const n = Number(text.trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

// Comme formatDuration, mais garde les secondes : « 52 min 30 s », « 1 h 05 min 10 s »
export function formatDurationSec(min: number): string {
  const total = Math.round(min * 60)
  const s = total % 60
  if (s === 0) return formatDuration(total / 60)
  return `${formatDuration(Math.floor(total / 60))} ${String(s).padStart(2, '0')} s`
}

// Allure en min/km → « 5:32 »
export function formatPace(minPerUnit: number): string {
  if (!Number.isFinite(minPerUnit) || minPerUnit <= 0) return '—'
  let m = Math.floor(minPerUnit)
  let s = Math.round((minPerUnit - m) * 60)
  if (s === 60) {
    m += 1
    s = 0
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

// « 45 » → 45 min ; « 45:30 » → 45,5 min ; « 1:05:30 » ou « 1h05 » → 65,5 / 65 min
export function parseDuration(text: string): number {
  const t = text.trim().toLowerCase().replace(/\s/g, '').replace('h', ':')
  if (!t) return NaN
  const parts = t.split(':')
  if (parts.some((p) => p !== '' && !/^\d+([.,]\d+)?$/.test(p))) return NaN
  const n = parts.map((p) => (p === '' ? 0 : parseNum(p)))
  if (n.length === 1) return n[0]
  if (n.length === 2) return t.includes(':') && text.toLowerCase().includes('h') ? n[0] * 60 + n[1] : n[0] + n[1] / 60
  if (n.length === 3) return n[0] * 60 + n[1] + n[2] / 60
  return NaN
}

// 65,5 min → « 1:05:30 »
export function durationText(min: number): string {
  const total = Math.round(min * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : s ? `${mm}:${ss}` : `${m}`
}

export function formatTimer(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
