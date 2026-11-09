import { useState } from 'react'
import { db, remove, save, stamp } from '../../db/db'
import { useFoods, useRecipes } from '../../db/hooks'
import type { Food, Recipe, RecipeTag } from '../../db/types'
import { DeleteButton, Field, NumInput, Sheet } from '../../components/ui'
import { IconPlus } from '../../components/icons'
import { fmt0 } from '../../lib/format'
import { normalize } from '../../lib/rules/meals'

const SOURCE_LABEL: Record<Food['source'], string> = { base: 'de base', manuel: 'ajouté', off: 'Open Food Facts' }

// ——— Mes aliments ———

export function FoodsSheet({ onClose }: { onClose: () => void }) {
  const foods = useFoods()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Food | 'new' | null>(null)
  if (editing) return <FoodForm food={editing === 'new' ? null : editing} onDone={() => setEditing(null)} onClose={onClose} />
  const q = normalize(query)
  const list = (foods ?? []).filter((f) => !q || normalize(`${f.name} ${f.brand}`).includes(q))
  return (
    <Sheet title="Mes aliments" onClose={onClose}>
      <button type="button" className="button primary" onClick={() => setEditing('new')}>
        <IconPlus size={20} /> Nouvel aliment
      </button>
      <input className="input" type="search" placeholder="Rechercher" aria-label="Rechercher un aliment" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="row-list">
        {list.map((f) => (
          <li key={f.id}>
            <button type="button" className="row" onClick={() => setEditing(f)}>
              <span>
                <span className="row-title">{f.name}</span>
                <span className="muted small">
                  {fmt0(f.kcal)} kcal / 100 g · {SOURCE_LABEL[f.source]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function FoodForm({ food, onDone, onClose }: { food: Food | null; onDone: () => void; onClose: () => void }) {
  const [d, setD] = useState({
    name: food?.name ?? '',
    brand: food?.brand ?? '',
    barcode: food?.barcode ?? '',
    kcal: food?.kcal ?? (null as number | null),
    protein: food?.protein ?? (null as number | null),
    carbs: food?.carbs ?? (null as number | null),
    fat: food?.fat ?? (null as number | null),
  })
  const valid = d.name.trim() && d.kcal !== null
  return (
    <Sheet title={food ? 'Modifier l’aliment' : 'Nouvel aliment'} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid) return
          const data = {
            name: d.name.trim(),
            brand: d.brand.trim(),
            barcode: d.barcode.replace(/\D/g, ''),
            kcal: d.kcal ?? 0,
            protein: d.protein ?? 0,
            carbs: d.carbs ?? 0,
            fat: d.fat ?? 0,
          }
          if (food) await save(db.foods, { ...food, ...data })
          else await db.foods.put(stamp<Food>({ ...data, source: 'manuel' }))
          onDone()
        }}
      >
        <Field label="Nom">
          <input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required />
        </Field>
        <div className="grid-2">
          <Field label="Marque (facultatif)">
            <input className="input" value={d.brand} onChange={(e) => setD({ ...d, brand: e.target.value })} />
          </Field>
          <Field label="Code-barres (facultatif)">
            <input className="input" inputMode="numeric" value={d.barcode} onChange={(e) => setD({ ...d, barcode: e.target.value })} />
          </Field>
        </div>
        <p className="muted small">Valeurs pour 100 g</p>
        <div className="grid-2">
          <Field label="Calories (kcal)">
            <NumInput value={d.kcal} onChange={(n) => setD({ ...d, kcal: n })} />
          </Field>
          <Field label="Protéines (g)">
            <NumInput value={d.protein} onChange={(n) => setD({ ...d, protein: n })} />
          </Field>
          <Field label="Glucides (g)">
            <NumInput value={d.carbs} onChange={(n) => setD({ ...d, carbs: n })} />
          </Field>
          <Field label="Lipides (g)">
            <NumInput value={d.fat} onChange={(n) => setD({ ...d, fat: n })} />
          </Field>
        </div>
        <button type="submit" className="button primary" disabled={!valid}>
          Enregistrer
        </button>
        <button type="button" className="button" onClick={onDone}>
          Annuler
        </button>
        {food && (
          <DeleteButton
            onConfirm={async () => {
              await remove(db.foods, food.id)
              onDone()
            }}
          />
        )}
      </form>
    </Sheet>
  )
}

// ——— Recettes ———

const TAGS: { value: RecipeTag; label: string }[] = [
  { value: 'petit-dejeuner', label: 'Petit-déjeuner' },
  { value: 'dejeuner', label: 'Déjeuner' },
  { value: 'diner', label: 'Dîner' },
  { value: 'collation', label: 'Collation' },
  { value: 'rapide', label: 'Rapide' },
  { value: 'vegetarien', label: 'Végétarien' },
]

export function RecipesSheet({ onClose }: { onClose: () => void }) {
  const recipes = useRecipes()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null)
  if (editing) return <RecipeForm recipe={editing === 'new' ? null : editing} onDone={() => setEditing(null)} onClose={onClose} />
  const q = normalize(query)
  const list = (recipes ?? []).filter((r) => !q || normalize(`${r.name} ${r.ingredients.join(' ')}`).includes(q))
  return (
    <Sheet title="Recettes" onClose={onClose}>
      <button type="button" className="button primary" onClick={() => setEditing('new')}>
        <IconPlus size={20} /> Nouvelle recette
      </button>
      <input className="input" type="search" placeholder="Rechercher" aria-label="Rechercher une recette" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="row-list">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" className="row" onClick={() => setEditing(r)}>
              <span>
                <span className="row-title">{r.name}</span>
                <span className="muted small">
                  {fmt0(r.kcal)} kcal · P {fmt0(r.protein)} g · {r.tags.map((t) => TAGS.find((x) => x.value === t)?.label).join(', ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function RecipeForm({ recipe, onDone, onClose }: { recipe: Recipe | null; onDone: () => void; onClose: () => void }) {
  const [d, setD] = useState({
    name: recipe?.name ?? '',
    tags: recipe?.tags ?? ([] as RecipeTag[]),
    protein: recipe?.protein ?? (null as number | null),
    carbs: recipe?.carbs ?? (null as number | null),
    fat: recipe?.fat ?? (null as number | null),
    ingredients: recipe?.ingredients.join(', ') ?? '',
    minutes: recipe?.minutes ?? (20 as number | null),
    notes: recipe?.notes ?? '',
  })
  // Calories calculées à partir des macros : 4 kcal/g (protéines, glucides), 9 kcal/g (lipides)
  const kcal = Math.round((d.protein ?? 0) * 4 + (d.carbs ?? 0) * 4 + (d.fat ?? 0) * 9)
  const valid = d.name.trim() && kcal > 0
  const toggle = (t: RecipeTag) => setD({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] })

  return (
    <Sheet title={recipe ? 'Modifier la recette' : 'Nouvelle recette'} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid) return
          const data = {
            name: d.name.trim(),
            tags: d.tags,
            kcal,
            protein: d.protein ?? 0,
            carbs: d.carbs ?? 0,
            fat: d.fat ?? 0,
            ingredients: d.ingredients
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            minutes: d.minutes ?? 0,
            notes: d.notes.trim(),
          }
          if (recipe) await save(db.recipes, { ...recipe, ...data })
          else await db.recipes.put(stamp<Recipe>(data))
          onDone()
        }}
      >
        <Field label="Nom">
          <input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required />
        </Field>
        <fieldset className="fieldset">
          <legend>Étiquettes</legend>
          <div className="chips">
            {TAGS.map((t) => (
              <label key={t.value} className="chip">
                <input type="checkbox" checked={d.tags.includes(t.value)} onChange={() => toggle(t.value)} />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="muted small">Valeurs pour une portion · {fmt0(kcal)} kcal</p>
        <div className="grid-2">
          <Field label="Protéines (g)">
            <NumInput value={d.protein} onChange={(n) => setD({ ...d, protein: n })} />
          </Field>
          <Field label="Glucides (g)">
            <NumInput value={d.carbs} onChange={(n) => setD({ ...d, carbs: n })} />
          </Field>
          <Field label="Lipides (g)">
            <NumInput value={d.fat} onChange={(n) => setD({ ...d, fat: n })} />
          </Field>
          <Field label="Temps (min)">
            <NumInput value={d.minutes} decimals={false} onChange={(n) => setD({ ...d, minutes: n })} />
          </Field>
        </div>
        <Field label="Ingrédients" hint="Séparés par des virgules. Servent à écarter tes aliments exclus.">
          <textarea className="input" rows={3} value={d.ingredients} onChange={(e) => setD({ ...d, ingredients: e.target.value })} />
        </Field>
        <Field label="Notes (facultatif)">
          <textarea className="input" rows={3} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        </Field>
        <button type="submit" className="button primary" disabled={!valid}>
          Enregistrer
        </button>
        <button type="button" className="button" onClick={onDone}>
          Annuler
        </button>
        {recipe && (
          <DeleteButton
            onConfirm={async () => {
              await remove(db.recipes, recipe.id)
              onDone()
            }}
          />
        )}
      </form>
    </Sheet>
  )
}
