import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconClose } from './icons'
import { parseNum } from '../lib/format'

// Fenêtre qui monte du bas de l'écran. Elle s'ouvre dès qu'elle est affichée :
// le parent l'affiche ou non ({open && <Sheet …/>}).
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    // Empêche la page derrière de défiler
    document.body.classList.add('no-scroll')
    return () => document.body.classList.remove('no-scroll')
  }, [])
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // clic sur le fond
      }}
    >
      <div className="sheet-inner">
        <header className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
            <IconClose />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

// Champ numérique qui accepte la virgule. Garde le texte tapé tant qu'il n'est pas un nombre complet.
export function NumInput({
  value,
  onChange,
  decimals = true,
  placeholder,
  ariaLabel,
  min = 0,
}: {
  value: number | null
  onChange: (n: number | null) => void
  decimals?: boolean
  placeholder?: string
  ariaLabel?: string
  min?: number
}) {
  const show = (v: number | null) => (v === null || Number.isNaN(v) ? '' : String(v).replace('.', ','))
  const [text, setText] = useState(show(value))
  const last = useRef(value)
  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setText(show(value))
    }
  }, [value])
  return (
    <input
      className="input"
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value
        setText(t)
        const n = t.trim() === '' ? null : parseNum(t)
        if (n === null || (!Number.isNaN(n) && n >= min)) {
          last.current = n
          onChange(n)
        }
      }}
    />
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({
  value,
  max,
  label,
  detail,
  tone = 'green',
}: {
  value: number
  max: number
  label: string
  detail: string
  tone?: 'green' | 'orange'
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const over = max > 0 && value > max * 1.05
  return (
    <div className="progress">
      <div className="progress-text">
        <span>{label}</span>
        <span className={over ? 'progress-over' : 'muted'}>{detail}</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={Math.round(value)}
      >
        <div className={`progress-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Suppression en deux temps, pour éviter les erreurs de doigt.
export function DeleteButton({ onConfirm, label = 'Supprimer' }: { onConfirm: () => void; label?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 6000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button type="button" className={`button ${armed ? 'danger' : 'ghost-danger'}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? 'Confirmer la suppression' : label}
    </button>
  )
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
