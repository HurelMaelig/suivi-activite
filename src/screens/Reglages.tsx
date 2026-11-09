import { useRef, useState } from 'react'
import { saveSetting } from '../db/db'
import { useMeasures, useNutrition, useSettings, type SettingsState } from '../db/hooks'
import type { CardioType, Goal, Goals, Profile, Sex } from '../db/types'
import { Field, NumInput, Segmented } from '../components/ui'
import { WeightSheet } from '../components/WeightSheet'
import { SyncCard } from '../components/SyncCard'
import { useTheme, type ThemeChoice } from '../lib/theme'
import { fmt0, fmtKg } from '../lib/format'
import { formatShort } from '../lib/dates'
import { backupFileName, exportData, importData, shareOrDownload } from '../lib/backup'
import { CARDIO_LABEL } from '../lib/labels'

const themes: { value: ThemeChoice; label: string }[] = [
  { value: 'clair', label: 'Clair' },
  { value: 'sombre', label: 'Sombre' },
  { value: 'auto', label: 'Automatique' },
]

export function Reglages() {
  const [theme, setTheme] = useTheme()
  const settings = useSettings()

  return (
    <>
      <section className="card">
        <h2>Thème</h2>
        <Segmented label="Thème" value={theme} onChange={setTheme} options={themes} />
        <p className="muted">Automatique suit le réglage de l’iPhone.</p>
      </section>

      {settings && <ProfileCard settings={settings} />}
      <NutritionCard />
      {settings && <GoalsCard goals={settings.goals} />}
      <BackupCard />

      <SyncCard />

      <section className="card">
        <h2>Connexions</h2>
        <ul className="status-list">
          <li>
            <span>Strava (activités Garmin)</span>
            <span className="muted">Phase 3</span>
          </li>
          <li>
            <span>Pas depuis l’iPhone</span>
            <span className="muted">Phase 3</span>
          </li>
        </ul>
      </section>
    </>
  )
}

function ProfileCard({ settings }: { settings: SettingsState }) {
  const measures = useMeasures()
  const [p, setP] = useState<Profile>(settings.profile)
  const [excluded, setExcluded] = useState(settings.profile.excluded.join(', '))
  const [saved, setSaved] = useState(false)
  // Si le profil enregistré change (enregistrement ou import), le formulaire le reprend
  const source = JSON.stringify(settings.profile)
  const [seen, setSeen] = useState(source)
  if (source !== seen) {
    setSeen(source)
    setP(settings.profile)
    setExcluded(settings.profile.excluded.join(', '))
  }
  const [addWeight, setAddWeight] = useState(false)
  const last = measures?.at(-1)
  const year = new Date().getFullYear()
  const valid = p.heightCm >= 100 && p.heightCm <= 250 && p.birthYear >= 1900 && p.birthYear <= year - 10

  return (
    <section className="card">
      <h2>Profil</h2>
      {!settings.profileSaved && <p className="note">Complète ton profil pour des calculs justes.</p>}
      <div className="row static">
        <span>
          <span className="row-title">Poids</span>
          <span className="muted small">{last ? `${fmtKg(last.weightKg)} · ${formatShort(last.date)}` : 'Pas encore de pesée'}</span>
        </span>
        <button type="button" className="button small-btn" onClick={() => setAddWeight(true)}>
          Nouvelle pesée
        </button>
      </div>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid) return
          await saveSetting('profile', {
            ...p,
            excluded: excluded
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          })
          setSaved(true)
        }}
        onChange={() => setSaved(false)}
      >
        <div className="grid-2">
          <Field label="Taille (cm)">
            <NumInput value={p.heightCm} decimals={false} onChange={(n) => setP({ ...p, heightCm: n ?? 0 })} />
          </Field>
          <Field label="Année de naissance">
            <NumInput value={p.birthYear} decimals={false} onChange={(n) => setP({ ...p, birthYear: n ?? 0 })} />
          </Field>
        </div>
        <Segmented<Sex>
          label="Sexe"
          value={p.sex}
          onChange={(sex) => {
            setP({ ...p, sex })
            setSaved(false)
          }}
          options={[
            { value: 'homme', label: 'Homme' },
            { value: 'femme', label: 'Femme' },
          ]}
        />
        <Segmented<Goal>
          label="Objectif"
          value={p.goal}
          onChange={(goal) => {
            setP({ ...p, goal })
            setSaved(false)
          }}
          options={[
            { value: 'maintien', label: 'Maintien' },
            { value: 'seche', label: 'Sèche' },
            { value: 'prise', label: 'Prise' },
          ]}
        />
        <Field label="Aliments exclus" hint="Séparés par des virgules. Ex. : poisson, champignons">
          <input className="input" value={excluded} onChange={(e) => setExcluded(e.target.value)} />
        </Field>
        {!valid && <p className="error">Vérifie la taille et l’année de naissance.</p>}
        <button type="submit" className="button primary" disabled={!valid}>
          {saved ? 'Enregistré' : 'Enregistrer le profil'}
        </button>
      </form>
      {addWeight && <WeightSheet measure={null} onClose={() => setAddWeight(false)} />}
    </section>
  )
}

const GOAL_TEXT: Record<Goal, string> = {
  maintien: 'maintien : dépense estimée',
  seche: 'sèche : dépense − 400 kcal, jamais plus de 20 %',
  prise: 'prise : dépense + 250 kcal',
}

function NutritionCard() {
  const n = useNutrition()
  const settings = useSettings()
  if (!n || !settings) return null
  const t = n.targets
  return (
    <section className="card">
      <h2>Besoins estimés</h2>
      {!t ? (
        <p className="muted">Ajoute une pesée pour calculer tes besoins.</p>
      ) : (
        <>
          <ul className="status-list">
            <li>
              <span>Métabolisme de base</span>
              <span>{fmt0(t.bmr)} kcal</span>
            </li>
            <li>
              <span>Facteur d’activité</span>
              <span>{String(n.factor).replace('.', ',')}</span>
            </li>
            <li>
              <span>Dépense totale estimée</span>
              <span>{fmt0(t.tdee)} kcal</span>
            </li>
            <li>
              <span>Objectif du jour</span>
              <span className="record">{fmt0(t.kcal)} kcal</span>
            </li>
            <li>
              <span>Protéines</span>
              <span>
                {fmt0(t.protein)} g <span className="muted small">({fmt0(t.proteinMin)} à {fmt0(t.proteinMax)})</span>
              </span>
            </li>
            <li>
              <span>Lipides · Glucides</span>
              <span>
                {fmt0(t.fat)} g · {fmt0(t.carbs)} g
              </span>
            </li>
          </ul>
          <p className="muted small">
            Formule de Mifflin-St Jeor. {n.measuredFactor ? 'Facteur calculé sur ton activité des 4 dernières semaines.' : 'Facteur par défaut (1,375) : il sera calculé après une semaine d’activité notée.'}{' '}
            Objectif {GOAL_TEXT[settings.profile.goal]}. Protéines 1,8 g/kg, lipides au moins 0,8 g/kg, glucides pour le reste.
          </p>
          <p className="note">Ce sont des estimations, pas un avis médical.</p>
        </>
      )}
    </section>
  )
}

const CARDIO_TYPES: CardioType[] = ['course', 'velo', 'natation']

function GoalsCard({ goals }: { goals: Goals }) {
  const [g, setG] = useState<Goals>(goals)
  const [saved, setSaved] = useState(false)
  // Si les objectifs enregistrés changent (enregistrement ou import), le formulaire les reprend
  const source = JSON.stringify(goals)
  const [seen, setSeen] = useState(source)
  if (source !== seen) {
    setSeen(source)
    setG(goals)
  }
  const set = (next: Goals) => {
    setG(next)
    setSaved(false)
  }
  const unit = (t: CardioType) => (t === 'natation' ? 'm' : 'km')
  const toUnit = (t: CardioType, km: number) => (t === 'natation' ? km * 1000 : km)
  const fromUnit = (t: CardioType, v: number) => (t === 'natation' ? v / 1000 : v)

  return (
    <section className="card">
      <h2>Objectifs</h2>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          await saveSetting('goals', g)
          setSaved(true)
        }}
      >
        <h3 className="group-title">Par semaine</h3>
        <div className="grid-2">
          <Field label="Séances de salle">
            <NumInput value={g.gymPerWeek} decimals={false} onChange={(n) => set({ ...g, gymPerWeek: n ?? 0 })} />
          </Field>
          <Field label="Sorties cardio">
            <NumInput value={g.cardioPerWeek} decimals={false} onChange={(n) => set({ ...g, cardioPerWeek: n ?? 0 })} />
          </Field>
          {CARDIO_TYPES.map((t) => (
            <Field key={t} label={`${CARDIO_LABEL[t]} (${unit(t)})`}>
              <NumInput value={toUnit(t, g.weeklyKm[t])} onChange={(n) => set({ ...g, weeklyKm: { ...g.weeklyKm, [t]: fromUnit(t, n ?? 0) } })} />
            </Field>
          ))}
          <Field label="Pas par jour">
            <NumInput value={g.stepsPerDay} decimals={false} onChange={(n) => set({ ...g, stepsPerDay: n ?? 0 })} />
          </Field>
        </div>
        <h3 className="group-title">Sur l’année</h3>
        <div className="grid-2">
          <Field label="Séances de salle">
            <NumInput value={g.yearlyGym} decimals={false} onChange={(n) => set({ ...g, yearlyGym: n ?? 0 })} />
          </Field>
          {CARDIO_TYPES.map((t) => (
            <Field key={t} label={`${CARDIO_LABEL[t]} (${unit(t)})`}>
              <NumInput value={toUnit(t, g.yearlyKm[t])} onChange={(n) => set({ ...g, yearlyKm: { ...g.yearlyKm, [t]: fromUnit(t, n ?? 0) } })} />
            </Field>
          ))}
        </div>
        <button type="submit" className="button primary">
          {saved ? 'Enregistré' : 'Enregistrer les objectifs'}
        </button>
      </form>
    </section>
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

function BackupCard() {
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  return (
    <section className="card">
      <h2>Sauvegarde</h2>
      <p className="muted small">
        Un fichier de sauvegarde reste utile, même avec la synchronisation (par exemple dans Fichiers ou iCloud Drive).
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button primary"
          onClick={async () => {
            const result = await shareOrDownload(await exportData(), backupFileName())
            setMessage(result === 'annule' ? null : { text: 'Fichier de sauvegarde créé.' })
          }}
        >
          Exporter
        </button>
        <button type="button" className="button" onClick={() => input.current?.click()}>
          Importer
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            const r = await importData(await file.text())
            setMessage({ text: `Import terminé : ${plural(r.added, 'ajout', 'ajouts')}, ${plural(r.updated, 'mise à jour', 'mises à jour')}, ${plural(r.skipped, 'inchangé', 'inchangés')}.` })
          } catch (err) {
            setMessage({ text: err instanceof Error ? err.message : 'Import impossible.', error: true })
          }
        }}
      />
      <p className="muted small">L’import fusionne : pour chaque élément, la version la plus récente est gardée. Rien n’est effacé.</p>
      {message && (
        <p className={message.error ? 'error' : 'ok'} role="status">
          {message.text}
        </p>
      )}
    </section>
  )
}
