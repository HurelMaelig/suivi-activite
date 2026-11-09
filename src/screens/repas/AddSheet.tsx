import { useState } from 'react'
import { alive, db, remove, save, stamp } from '../../db/db'
import { useFoods, useRecipes } from '../../db/hooks'
import type { Food, MealEntry, MealSlot, Recipe } from '../../db/types'
import { DeleteButton, Empty, Field, NumInput, Segmented, Sheet } from '../../components/ui'
import { IconBarcode, IconSearch } from '../../components/icons'
import { Scanner } from '../../components/Scanner'
import { fmt0, fmt1 } from '../../lib/format'
import { normalize } from '../../lib/rules/meals'
import { fetchBarcode, searchOff, type OffProduct } from '../../lib/off'
import { useOnline } from '../../lib/prefs'
import { MEAL_LABEL } from '../../lib/labels'

type Tab = 'aliments' | 'recettes' | 'scanner' | 'libre'

// Aliment choisi, pour 100 g (local ou trouvé sur Open Food Facts)
interface Picked {
  foodId: string | null
  name: string
  brand: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  barcode: string
}

const fromFood = (f: Food): Picked => ({ ...f, foodId: f.id })
const fromOff = (p: OffProduct): Picked => ({ ...p, foodId: null, barcode: p.code })

export function recipeEntry(r: Recipe, portions: number, date: string, meal: MealSlot): MealEntry {
  return stamp<MealEntry>({
    date,
    meal,
    label: r.name,
    quantity: portions === 1 ? '1 portion' : `${fmt1(portions)} portions`,
    kcal: Math.round(r.kcal * portions),
    protein: r.protein * portions,
    carbs: r.carbs * portions,
    fat: r.fat * portions,
    foodId: null,
    recipeId: r.id,
  })
}

// Un produit Open Food Facts choisi est gardé dans « Mes aliments » : il marchera ensuite hors ligne.
async function ensureFood(p: Picked): Promise<string> {
  if (p.foodId) return p.foodId
  if (p.barcode) {
    const existing = alive(await db.foods.where('barcode').equals(p.barcode).toArray())[0]
    if (existing) return existing.id
  }
  const food = stamp<Food>({
    name: p.name,
    brand: p.brand,
    kcal: p.kcal,
    protein: p.protein,
    carbs: p.carbs,
    fat: p.fat,
    barcode: p.barcode,
    source: 'off',
  })
  await db.foods.put(food)
  return food.id
}

export function AddSheet({ date, slot, onClose }: { date: string; slot: MealSlot; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('aliments')
  const [picked, setPicked] = useState<Picked | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const title = `Ajouter · ${MEAL_LABEL[slot]}`

  if (picked) return <QuantityForm title={title} food={picked} date={date} slot={slot} onBack={() => setPicked(null)} onClose={onClose} />
  if (recipe) return <PortionForm title={title} recipe={recipe} date={date} slot={slot} onBack={() => setRecipe(null)} onClose={onClose} />

  return (
    <Sheet title={title} onClose={onClose}>
      <Segmented<Tab>
        label="Source"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'aliments', label: 'Aliments' },
          { value: 'recettes', label: 'Recettes' },
          { value: 'scanner', label: 'Scanner' },
          { value: 'libre', label: 'Libre' },
        ]}
      />
      {tab === 'aliments' && <FoodsTab onPick={setPicked} />}
      {tab === 'recettes' && <RecipesTab onPick={setRecipe} />}
      {tab === 'scanner' && <ScanTab onPick={setPicked} />}
      {tab === 'libre' && <FreeForm date={date} slot={slot} onClose={onClose} />}
    </Sheet>
  )
}

function FoodsTab({ onPick }: { onPick: (p: Picked) => void }) {
  const foods = useFoods()
  const online = useOnline()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OffProduct[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const q = normalize(query)
  const local = (foods ?? []).filter((f) => !q || normalize(`${f.name} ${f.brand}`).includes(q)).slice(0, 40)

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !online) return
    setStatus('loading')
    try {
      setResults(await searchOff(query.trim()))
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recherche impossible.')
      setStatus('error')
    }
  }

  return (
    <>
      <form className="search" onSubmit={search} role="search">
        <input
          className="input"
          type="search"
          placeholder="Rechercher un aliment"
          aria-label="Rechercher un aliment"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setResults(null)
          }}
        />
        <button type="submit" className="button" disabled={!online || !query.trim() || status === 'loading'} aria-label="Chercher sur Open Food Facts">
          <IconSearch />
        </button>
      </form>
      <p className="muted small">
        {online
          ? 'Liste : tes aliments. La loupe cherche aussi sur Open Food Facts.'
          : 'Hors ligne : seule la recherche dans tes aliments fonctionne.'}
      </p>
      {status === 'loading' && <p className="muted">Recherche sur Open Food Facts…</p>}
      {status === 'error' && <p className="error">{error}</p>}
      {results && (
        <>
          <h3 className="group-title">Open Food Facts</h3>
          {results.length === 0 && <Empty>Aucun résultat avec des valeurs nutritionnelles.</Empty>}
          <FoodList items={results.map(fromOff)} onPick={onPick} />
        </>
      )}
      <h3 className="group-title">Mes aliments</h3>
      {local.length === 0 && <Empty>Aucun aliment ne correspond.</Empty>}
      <FoodList items={local.map(fromFood)} onPick={onPick} />
    </>
  )
}

function FoodList({ items, onPick }: { items: Picked[]; onPick: (p: Picked) => void }) {
  return (
    <ul className="row-list">
      {items.map((f, i) => (
        <li key={(f.foodId ?? f.barcode) + i}>
          <button type="button" className="row" onClick={() => onPick(f)}>
            <span>
              <span className="row-title">{f.name}</span>
              <span className="muted small">
                {f.brand ? `${f.brand} · ` : ''}
                {fmt0(f.kcal)} kcal · P {fmt1(f.protein)} g pour 100 g
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function RecipesTab({ onPick }: { onPick: (r: Recipe) => void }) {
  const recipes = useRecipes()
  const [query, setQuery] = useState('')
  const q = normalize(query)
  const list = (recipes ?? []).filter((r) => !q || normalize(`${r.name} ${r.ingredients.join(' ')}`).includes(q))
  return (
    <>
      <input className="input" type="search" placeholder="Rechercher une recette" aria-label="Rechercher une recette" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="row-list">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" className="row" onClick={() => onPick(r)}>
              <span>
                <span className="row-title">{r.name}</span>
                <span className="muted small">
                  {fmt0(r.kcal)} kcal · P {fmt0(r.protein)} g par portion
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function ScanTab({ onPick }: { onPick: (p: Picked) => void }) {
  const online = useOnline()
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(true)
  const [message, setMessage] = useState('')

  const lookup = async (raw: string) => {
    const clean = raw.replace(/\D/g, '')
    setCode(clean)
    setScanning(false)
    if (!clean) return
    setMessage('Recherche du produit…')
    const local = alive(await db.foods.where('barcode').equals(clean).toArray())[0]
    if (local) return onPick(fromFood(local))
    if (!online) return setMessage('Hors ligne et produit inconnu : utilise l’onglet Libre.')
    try {
      const p = await fetchBarcode(clean)
      if (p) onPick(fromOff(p))
      else setMessage('Produit introuvable sur Open Food Facts : utilise l’onglet Libre.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Recherche impossible.')
    }
  }

  return (
    <>
      {scanning ? (
        <Scanner onCode={lookup} />
      ) : (
        <button type="button" className="button" onClick={() => setScanning(true)}>
          <IconBarcode /> Scanner à nouveau
        </button>
      )}
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault()
          void lookup(code)
        }}
      >
        <input className="input" inputMode="numeric" placeholder="Ou tape le code-barres" aria-label="Code-barres" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="button" disabled={!code.trim()}>
          OK
        </button>
      </form>
      {message && <p className="muted">{message}</p>}
    </>
  )
}

function QuantityForm({
  title,
  food,
  date,
  slot,
  onBack,
  onClose,
}: {
  title: string
  food: Picked
  date: string
  slot: MealSlot
  onBack: () => void
  onClose: () => void
}) {
  const [grams, setGrams] = useState<number | null>(100)
  const f = (grams ?? 0) / 100
  return (
    <Sheet title={title} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!grams) return
          const foodId = await ensureFood(food)
          await db.meals.put(
            stamp<MealEntry>({
              date,
              meal: slot,
              label: food.brand ? `${food.name} (${food.brand})` : food.name,
              quantity: `${fmt0(grams)} g`,
              kcal: Math.round(food.kcal * f),
              protein: food.protein * f,
              carbs: food.carbs * f,
              fat: food.fat * f,
              foodId,
              recipeId: null,
            }),
          )
          onClose()
        }}
      >
        <p className="row-title">{food.name}</p>
        <Field label="Quantité (g ou ml)">
          <NumInput value={grams} onChange={setGrams} decimals={false} />
        </Field>
        <p className="muted">
          {fmt0(food.kcal * f)} kcal · P {fmt1(food.protein * f)} g · G {fmt1(food.carbs * f)} g · L {fmt1(food.fat * f)} g
        </p>
        <button type="submit" className="button primary" disabled={!grams}>
          Ajouter
        </button>
        <button type="button" className="button" onClick={onBack}>
          Retour
        </button>
      </form>
    </Sheet>
  )
}

function PortionForm({
  title,
  recipe,
  date,
  slot,
  onBack,
  onClose,
}: {
  title: string
  recipe: Recipe
  date: string
  slot: MealSlot
  onBack: () => void
  onClose: () => void
}) {
  const [portions, setPortions] = useState<number | null>(1)
  const p = portions ?? 0
  return (
    <Sheet title={title} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!p) return
          await db.meals.put(recipeEntry(recipe, p, date, slot))
          onClose()
        }}
      >
        <p className="row-title">{recipe.name}</p>
        <p className="muted small">{recipe.ingredients.join(', ')}</p>
        <Field label="Portions">
          <NumInput value={portions} onChange={setPortions} />
        </Field>
        <p className="muted">
          {fmt0(recipe.kcal * p)} kcal · P {fmt1(recipe.protein * p)} g · G {fmt1(recipe.carbs * p)} g · L {fmt1(recipe.fat * p)} g
        </p>
        <button type="submit" className="button primary" disabled={!p}>
          Ajouter
        </button>
        <button type="button" className="button" onClick={onBack}>
          Retour
        </button>
      </form>
    </Sheet>
  )
}

function FreeForm({ date, slot, onClose }: { date: string; slot: MealSlot; onClose: () => void }) {
  const [label, setLabel] = useState('')
  const [quantity, setQuantity] = useState('')
  const [v, setV] = useState({ kcal: null as number | null, protein: null as number | null, carbs: null as number | null, fat: null as number | null })
  const valid = label.trim() && v.kcal !== null
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid) return
        await db.meals.put(
          stamp<MealEntry>({
            date,
            meal: slot,
            label: label.trim(),
            quantity: quantity.trim() || '1 portion',
            kcal: Math.round(v.kcal ?? 0),
            protein: v.protein ?? 0,
            carbs: v.carbs ?? 0,
            fat: v.fat ?? 0,
            foodId: null,
            recipeId: null,
          }),
        )
        onClose()
      }}
    >
      <Field label="Nom">
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} required />
      </Field>
      <Field label="Quantité (facultatif)">
        <input className="input" value={quantity} placeholder="1 assiette" onChange={(e) => setQuantity(e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Calories (kcal)">
          <NumInput value={v.kcal} onChange={(n) => setV({ ...v, kcal: n })} />
        </Field>
        <Field label="Protéines (g)">
          <NumInput value={v.protein} onChange={(n) => setV({ ...v, protein: n })} />
        </Field>
        <Field label="Glucides (g)">
          <NumInput value={v.carbs} onChange={(n) => setV({ ...v, carbs: n })} />
        </Field>
        <Field label="Lipides (g)">
          <NumInput value={v.fat} onChange={(n) => setV({ ...v, fat: n })} />
        </Field>
      </div>
      <button type="submit" className="button primary" disabled={!valid}>
        Ajouter
      </button>
    </form>
  )
}

const SLOT_OPTIONS = Object.entries(MEAL_LABEL) as [MealSlot, string][]

export function EntrySheet({ entry, onClose }: { entry: MealEntry; onClose: () => void }) {
  const [d, setD] = useState(entry)
  return (
    <Sheet title="Modifier" onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          await save(db.meals, { ...d, label: d.label.trim() || entry.label })
          onClose()
        }}
      >
        <Field label="Nom">
          <input className="input" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} />
        </Field>
        <div className="grid-2">
          <Field label="Repas">
            <select className="input" value={d.meal} onChange={(e) => setD({ ...d, meal: e.target.value as MealSlot })}>
              {SLOT_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantité">
            <input className="input" value={d.quantity} onChange={(e) => setD({ ...d, quantity: e.target.value })} />
          </Field>
          <Field label="Calories (kcal)">
            <NumInput value={d.kcal} onChange={(n) => setD({ ...d, kcal: n ?? 0 })} />
          </Field>
          <Field label="Protéines (g)">
            <NumInput value={Math.round(d.protein * 10) / 10} onChange={(n) => setD({ ...d, protein: n ?? 0 })} />
          </Field>
          <Field label="Glucides (g)">
            <NumInput value={Math.round(d.carbs * 10) / 10} onChange={(n) => setD({ ...d, carbs: n ?? 0 })} />
          </Field>
          <Field label="Lipides (g)">
            <NumInput value={Math.round(d.fat * 10) / 10} onChange={(n) => setD({ ...d, fat: n ?? 0 })} />
          </Field>
        </div>
        <button type="submit" className="button primary">
          Enregistrer
        </button>
        <DeleteButton
          onConfirm={async () => {
            await remove(db.meals, entry.id)
            onClose()
          }}
        />
      </form>
    </Sheet>
  )
}
