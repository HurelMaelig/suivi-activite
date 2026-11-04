import { useTheme, type ThemeChoice } from '../lib/theme'

const options: { value: ThemeChoice; label: string }[] = [
  { value: 'clair', label: 'Clair' },
  { value: 'sombre', label: 'Sombre' },
  { value: 'auto', label: 'Automatique' },
]

export function Reglages() {
  const [theme, setTheme] = useTheme()

  return (
    <section className="card">
      <h2 id="theme-title">Thème</h2>
      <div className="segmented" role="radiogroup" aria-labelledby="theme-title">
        {options.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="muted">Automatique suit le réglage de l’iPhone.</p>
    </section>
  )
}
