import { useState } from 'react'

export type ThemeChoice = 'clair' | 'sombre' | 'auto'

const KEY = 'theme'
// Mêmes valeurs que --bg dans styles.css : colore la barre d'état de l'iPhone.
const BAR_COLOR = { light: '#F2F4F1', dark: '#0E1512' }

const media = window.matchMedia('(prefers-color-scheme: dark)')
let current = readChoice()

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'clair' || saved === 'sombre') return saved
  } catch {
    // Stockage indisponible (navigation privée) : on reste en automatique.
  }
  return 'auto'
}

function apply() {
  const root = document.documentElement
  if (current === 'auto') delete root.dataset.theme
  else root.dataset.theme = current === 'sombre' ? 'dark' : 'light'

  const dark = current === 'sombre' || (current === 'auto' && media.matches)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? BAR_COLOR.dark : BAR_COLOR.light)
}

// À appeler une fois au démarrage, quel que soit l'écran affiché.
export function initTheme() {
  apply()
  media.addEventListener('change', apply)
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(current)

  const change = (next: ThemeChoice) => {
    current = next
    setChoice(next)
    apply()
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Le choix s'applique quand même, il ne sera juste pas mémorisé.
    }
  }

  return [choice, change] as const
}
