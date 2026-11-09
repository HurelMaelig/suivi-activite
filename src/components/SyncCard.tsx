import { useState } from 'react'
import { Field } from './ui'
import { formatAgo } from '../lib/dates'
import { useOnline } from '../lib/prefs'
import { sendCode, signOut, syncNow, useSync, verifyCode, type SyncState } from '../sync'

// Texte court de l'état, réutilisé sur l'Accueil
export function syncLabel(s: SyncState): { text: string; tone: 'ok' | 'muted' | 'error' } {
  switch (s.status) {
    case 'disabled':
      return { text: 'Non configurée', tone: 'muted' }
    case 'loading':
      return { text: '…', tone: 'muted' }
    case 'signed-out':
      return { text: 'Non connecté', tone: 'muted' }
    case 'syncing':
      return { text: 'En cours…', tone: 'muted' }
    case 'offline':
      return { text: 'En attente du réseau', tone: 'muted' }
    case 'error':
      return { text: 'Impossible', tone: 'error' }
    default:
      return { text: s.lastSync ? `À jour ${formatAgo(s.lastSync)}` : 'Connecté', tone: 'ok' }
  }
}

export function SyncCard() {
  const s = useSync()
  return (
    <section className="card">
      <h2>Compte et synchronisation</h2>
      {s.status === 'disabled' && <p className="muted">La synchronisation n’est pas configurée sur cette version de l’app.</p>}
      {s.status === 'loading' && <p className="muted">Chargement…</p>}
      {s.status === 'signed-out' && <SignIn />}
      {s.email && <SignedIn s={s} />}
    </section>
  )
}

function SignedIn({ s }: { s: SyncState }) {
  const label = syncLabel(s)
  return (
    <>
      <ul className="status-list">
        <li>
          <span>Compte</span>
          <span>{s.email}</span>
        </li>
        <li>
          <span>Synchronisation</span>
          <span className={label.tone === 'error' ? 'error' : label.tone}>{label.text}</span>
        </li>
      </ul>
      {s.error && <p className={s.status === 'error' ? 'note' : 'muted small'}>{s.error}</p>}
      <div className="button-row">
        <button type="button" className="button" onClick={() => void syncNow()} disabled={s.status === 'syncing'}>
          Synchroniser maintenant
        </button>
        <button type="button" className="button" onClick={() => void signOut()}>
          Se déconnecter
        </button>
      </div>
      <p className="muted small">Tes données restent aussi sur ce téléphone : l’app marche sans réseau et envoie les changements dès qu’elle peut.</p>
    </>
  )
}

function SignIn() {
  const online = useOnline()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'email') {
    return (
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await sendCode(email)
            setStep('code')
          })
        }}
      >
        <p className="muted small">
          Connecte-toi pour sauvegarder tes données en ligne et les retrouver sur un autre appareil. Pas de mot de passe : tu reçois un code par e-mail.
        </p>
        <Field label="Adresse e-mail">
          <input className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {!online && <p className="muted small">Hors ligne : la connexion demande le réseau.</p>}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="button primary" disabled={busy || !online || !email.includes('@')}>
          Recevoir un code
        </button>
      </form>
    )
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        void run(() => verifyCode(email, code))
      }}
    >
      <p className="muted small">
        Un e-mail a été envoyé à <strong>{email}</strong>. Tape ici le code qu’il contient. Sur iPhone, utilise le code plutôt que le lien : le lien ouvrirait Safari et non l’app.
      </p>
      <Field label="Code reçu">
        <input
          className="input code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          required
        />
      </Field>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="button primary" disabled={busy || code.replace(/\s/g, '').length < 6}>
        Valider
      </button>
      <button type="button" className="button" onClick={() => setStep('email')} disabled={busy}>
        Changer d’adresse ou renvoyer un code
      </button>
    </form>
  )
}
