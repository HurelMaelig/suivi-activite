import { useEffect, useState } from 'react'

// Petites préférences d'affichage, gardées sur cet appareil seulement.
function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    if (v && (allowed as readonly string[]).includes(v)) return v as T
  } catch {
    // Stockage indisponible : valeur par défaut
  }
  return fallback
}

export function usePref<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, allowed, fallback))
  const set = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem(key, v)
    } catch {
      // Le choix reste valable jusqu'à la fermeture
    }
  }
  return [value, set] as const
}

export const MINUTES = ['45', '60', '75'] as const
export const useAvailableMinutes = () => usePref('minutes', MINUTES, '60')

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
