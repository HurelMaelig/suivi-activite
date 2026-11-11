import { useSyncExternalStore } from 'react'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { db, TABLES } from '../db/db'
import { applyingRemote, syncOnce, type Cursor, type Remote } from './engine'

// Pilote de la synchronisation : connexion, déclenchements, état affiché dans l'app.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? ''
export const syncConfigured = !!(SUPABASE_URL && KEY)

export type SyncStatus = 'disabled' | 'loading' | 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  email: string | null
  lastSync: string | null
  error: string | null
}

let state: SyncState = { status: syncConfigured ? 'loading' : 'disabled', email: null, lastSync: null, error: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

let client: SupabaseClient | null = null
let remote: Remote | null = null
let userId: string | null = null

interface Meta {
  cursor: Cursor | null
  lastSync: string | null
}
const metaKey = () => `sync:${userId}`
function readMeta(): Meta {
  try {
    const raw = localStorage.getItem(metaKey())
    if (raw) return JSON.parse(raw)
  } catch {
    // stockage illisible : on repart de zéro, la fusion évite les pertes
  }
  return { cursor: null, lastSync: null }
}
function writeMeta(m: Meta) {
  try {
    localStorage.setItem(metaKey(), JSON.stringify(m))
  } catch {
    // sans stockage, la prochaine synchro renverra un peu plus de données
  }
}

const OFFLINE_MSG = 'Hors ligne : la synchronisation reprendra au retour du réseau.'
const FAIL_MSG =
  'Synchronisation impossible (réseau, ou projet Supabase en pause). L’app reste utilisable : tes données sont gardées sur le téléphone.'

function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : ''
  if (!msg || /fetch|network|load failed/i.test(msg)) return FAIL_MSG
  return `${FAIL_MSG} Détail : ${msg}`
}

let timer: ReturnType<typeof setTimeout> | undefined
let running = false
let again = false

export function scheduleSync(delayMs = 0) {
  if (!userId) return
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delayMs)
}

export async function syncNow() {
  if (!remote || !userId) return
  if (!navigator.onLine) {
    set({ status: 'offline', error: OFFLINE_MSG })
    return
  }
  if (running) {
    again = true
    return
  }
  running = true
  set({ status: 'syncing', error: null })
  try {
    const meta = readMeta()
    const r = await syncOnce(db, remote, meta.cursor)
    const lastSync = new Date().toISOString()
    writeMeta({ cursor: r.cursor, lastSync })
    set({ status: 'idle', lastSync, error: null })
  } catch (e) {
    set({ status: 'error', error: errorMessage(e) })
  } finally {
    running = false
    if (again) {
      again = false
      scheduleSync(1000)
    }
  }
}

function onSession(session: Session | null) {
  if (!session) {
    userId = null
    set({ status: 'signed-out', email: null, lastSync: null, error: null })
    return
  }
  if (session.user.id === userId) return
  userId = session.user.id
  set({ status: 'idle', email: session.user.email ?? null, lastSync: readMeta().lastSync, error: null })
  scheduleSync(0)
}

export async function initSync() {
  if (!syncConfigured) return
  try {
    const mod = await import('./supabase')
    client = mod.makeClient(SUPABASE_URL, KEY)
    remote = mod.supabaseRemote(client)
    const { data } = await client.auth.getSession()
    onSession(data.session)
    // Pas d'appel à Supabase directement dans ce rappel (recommandation de la bibliothèque)
    client.auth.onAuthStateChange((_event, session) => setTimeout(() => onSession(session), 0))
  } catch (e) {
    set({ status: 'error', error: errorMessage(e) })
    return
  }

  // Une modification locale déclenche un envoi quelques secondes plus tard
  for (const name of TABLES) {
    const t = db.table(name)
    const changed = () => {
      if (!applyingRemote) scheduleSync(4000)
    }
    t.hook('creating', changed)
    t.hook('updating', changed)
  }
  window.addEventListener('online', () => scheduleSync(0))
  window.addEventListener('offline', () => set({ status: 'offline', error: OFFLINE_MSG }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(0)
  })
  setInterval(() => scheduleSync(0), 5 * 60_000)
}

function authError(error: { message?: string; status?: number }): Error {
  if (error.status === 429) return new Error('Trop de demandes : attends quelques minutes avant de redemander un code.')
  if (/expired|invalid/i.test(error.message ?? '')) return new Error('Lien ou code expiré, ou déjà utilisé. Demande un nouvel e-mail.')
  if (/fetch|network/i.test(error.message ?? '')) return new Error('Pas de réseau, ou serveur indisponible.')
  return new Error(error.message || 'Erreur de connexion.')
}

export async function sendCode(email: string) {
  if (!client) throw new Error('Synchronisation non configurée.')
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: location.origin + import.meta.env.BASE_URL },
  })
  if (error) throw authError(error)
}

export type AuthInput =
  | { kind: 'code'; code: string }
  | { kind: 'link'; tokenHash: string; type: 'magiclink' | 'signup' | 'invite' | 'email' }
  | { kind: 'invalid'; reason: string }

// Le texte collé peut être le code à 6 chiffres ou le lien « Sign in » de l'e-mail.
// Le lien contient un jeton qu'on valide ici même, sans ouvrir Safari.
export function parseAuthInput(text: string): AuthInput {
  const t = text.trim()
  const link = t.match(/https?:\/\/[^\s<>"')\]]+/)?.[0]
  if (link) {
    let url: URL
    try {
      url = new URL(link)
    } catch {
      return { kind: 'invalid', reason: 'Lien non reconnu.' }
    }
    const tokenHash = url.searchParams.get('token') ?? url.searchParams.get('token_hash')
    if (!tokenHash) return { kind: 'invalid', reason: 'Lien non reconnu : copie le lien « Sign in » de l’e-mail.' }
    if (tokenHash.startsWith('pkce_')) return { kind: 'invalid', reason: 'Ce lien ne peut pas être collé : utilise l’app sur l’appareil qui a demandé l’e-mail.' }
    const raw = url.searchParams.get('type')
    const type = raw === 'signup' || raw === 'invite' || raw === 'email' ? raw : 'magiclink'
    return { kind: 'link', tokenHash, type }
  }
  const code = t.replace(/\s/g, '')
  if (/^\d{6,10}$/.test(code)) return { kind: 'code', code }
  return { kind: 'invalid', reason: 'Colle le lien « Sign in » de l’e-mail, ou tape le code reçu.' }
}

export async function verifyCode(email: string, input: string) {
  if (!client) throw new Error('Synchronisation non configurée.')
  const parsed = parseAuthInput(input)
  if (parsed.kind === 'invalid') throw new Error(parsed.reason)
  const { error } =
    parsed.kind === 'code'
      ? await client.auth.verifyOtp({ email: email.trim(), token: parsed.code, type: 'email' })
      : await client.auth.verifyOtp({ token_hash: parsed.tokenHash, type: parsed.type })
  if (error) throw authError(error)
}

// Déconnexion : les données restent sur le téléphone.
export async function signOut() {
  if (!client) return
  clearTimeout(timer)
  await client.auth.signOut()
}
