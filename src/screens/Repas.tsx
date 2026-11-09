import { useState } from 'react'
import { db } from '../db/db'
import { useMealsOn, useNutrition, useRecipes, useSettings } from '../db/hooks'
import type { MealEntry, MealSlot, Recipe, RecipeTag } from '../db/types'
import { Progress, SectionHead, Sheet } from '../components/ui'
import { IconBack, IconNext, IconPlus } from '../components/icons'
import { addDays, formatLong, today } from '../lib/dates'
import { fmt0 } from '../lib/format'
import { suggestRecipes } from '../lib/rules/meals'
import { MEAL_LABEL } from '../lib/labels'
import { AddSheet, EntrySheet, recipeEntry } from './repas/AddSheet'
import { FoodsSheet, RecipesSheet } from './repas/Manage'

const SLOTS: MealSlot[] = ['petit-dejeuner', 'dejeuner', 'collation', 'diner']

function slotForNow(): MealSlot {
  const h = new Date().getHours()
  if (h < 10) return 'petit-dejeuner'
  if (h < 15) return 'dejeuner'
  if (h < 18) return 'collation'
  return 'diner'
}

export function Repas() {
  const [date, setDate] = useState(today())
  const meals = useMealsOn(date)
  const nutrition = useNutrition()
  const recipes = useRecipes()
  const settings = useSettings()
  const [adding, setAdding] = useState<MealSlot | null>(null)
  const [entry, setEntry] = useState<MealEntry | null>(null)
  const [manage, setManage] = useState<'foods' | 'recipes' | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  if (!meals || !nutrition || !recipes || !settings) return null

  const total = meals.reduce(
    (t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
  const t = nutrition.targets
  const isToday = date === today()
  // Ce soir par défaut ; le matin, on propose plutôt le prochain repas
  const ideaSlot: MealSlot = isToday ? (slotForNow() === 'collation' ? 'diner' : slotForNow()) : 'diner'
  const ideas = t
    ? suggestRecipes(recipes, { kcal: t.kcal - total.kcal, protein: t.protein - total.protein }, ideaSlot as RecipeTag, settings.profile.excluded)
    : []

  return (
    <>
      <div className="day-nav">
        <button type="button" className="icon-button" onClick={() => setDate(addDays(date, -1))} aria-label="Jour précédent">
          <IconBack />
        </button>
        <span className="day-nav-label">{isToday ? 'Aujourd’hui' : formatLong(date)}</span>
        <button type="button" className="icon-button" onClick={() => setDate(addDays(date, 1))} disabled={isToday} aria-label="Jour suivant">
          <IconNext />
        </button>
      </div>

      <section className="card">
        <h2>Bilan du jour</h2>
        {t ? (
          <>
            <Progress label="Calories" value={total.kcal} max={t.kcal} detail={`${fmt0(total.kcal)} / ${fmt0(t.kcal)} kcal`} />
            <Progress label="Protéines" value={total.protein} max={t.protein} detail={`${fmt0(total.protein)} / ${fmt0(t.protein)} g`} />
            <Progress label="Glucides" value={total.carbs} max={t.carbs} detail={`${fmt0(total.carbs)} / ${fmt0(t.carbs)} g`} />
            <Progress label="Lipides" value={total.fat} max={t.fat} detail={`${fmt0(total.fat)} / ${fmt0(t.fat)} g`} />
            <p className="muted small">Estimations, pas un avis médical. Détail du calcul dans Réglages.</p>
          </>
        ) : (
          <p className="muted">
            {fmt0(total.kcal)} kcal · P {fmt0(total.protein)} g · G {fmt0(total.carbs)} g · L {fmt0(total.fat)} g.{' '}
            <a href="#reglages" className="link">
              Ajoute ton poids
            </a>{' '}
            pour calculer tes objectifs.
          </p>
        )}
      </section>

      {ideas.length > 0 && (
        <section className="card highlight">
          <h2>{ideaSlot === 'diner' ? 'Idée pour ce soir' : `Idée pour le ${MEAL_LABEL[ideaSlot].toLowerCase()}`}</h2>
          <p className="muted small">
            Il reste {fmt0(Math.max(0, t!.kcal - total.kcal))} kcal et {fmt0(Math.max(0, t!.protein - total.protein))} g de protéines.
          </p>
          <ul className="row-list">
            {ideas.map((r) => (
              <li key={r.id}>
                <button type="button" className="row" onClick={() => setRecipe(r)}>
                  <span>
                    <span className="row-title">{r.name}</span>
                    <span className="muted small">
                      {fmt0(r.kcal)} kcal · P {fmt0(r.protein)} g · {r.minutes} min
                    </span>
                  </span>
                  <span className="muted small">Voir</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {SLOTS.map((slot) => {
        const list = meals.filter((m) => m.meal === slot)
        const kcal = list.reduce((s, m) => s + m.kcal, 0)
        return (
          <section className="card" key={slot}>
            <SectionHead
              title={MEAL_LABEL[slot]}
              action={<span className="muted small">{list.length ? `${fmt0(kcal)} kcal` : ''}</span>}
            />
            <ul className="row-list">
              {list.map((m) => (
                <li key={m.id}>
                  <button type="button" className="row" onClick={() => setEntry(m)}>
                    <span>
                      <span className="row-title">{m.label}</span>
                      <span className="muted small">
                        {m.quantity} · P {fmt0(m.protein)} g · G {fmt0(m.carbs)} g · L {fmt0(m.fat)} g
                      </span>
                    </span>
                    <span className="small">{fmt0(m.kcal)} kcal</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="button" onClick={() => setAdding(slot)}>
              <IconPlus size={20} /> Ajouter
            </button>
          </section>
        )
      })}

      <section className="card">
        <h2>Gérer</h2>
        <div className="button-row">
          <button type="button" className="button" onClick={() => setManage('foods')}>
            Mes aliments
          </button>
          <button type="button" className="button" onClick={() => setManage('recipes')}>
            Recettes
          </button>
        </div>
      </section>

      {adding && <AddSheet date={date} slot={adding} onClose={() => setAdding(null)} />}
      {entry && <EntrySheet entry={entry} onClose={() => setEntry(null)} />}
      {manage === 'foods' && <FoodsSheet onClose={() => setManage(null)} />}
      {manage === 'recipes' && <RecipesSheet onClose={() => setManage(null)} />}
      {recipe && (
        <RecipeIdeaSheet
          recipe={recipe}
          onClose={() => setRecipe(null)}
          onAdd={async () => {
            await db.meals.put(recipeEntry(recipe, 1, date, ideaSlot))
            setRecipe(null)
          }}
        />
      )}
    </>
  )
}

function RecipeIdeaSheet({ recipe, onClose, onAdd }: { recipe: Recipe; onClose: () => void; onAdd: () => void }) {
  return (
    <Sheet title={recipe.name} onClose={onClose}>
      <p>
        {fmt0(recipe.kcal)} kcal · P {fmt0(recipe.protein)} g · G {fmt0(recipe.carbs)} g · L {fmt0(recipe.fat)} g · {recipe.minutes} min
      </p>
      <h3 className="group-title">Ingrédients</h3>
      <p>{recipe.ingredients.join(', ')}</p>
      {recipe.notes && <p className="muted">{recipe.notes}</p>}
      <button type="button" className="button primary" onClick={onAdd}>
        <IconPlus size={20} /> Ajouter une portion à mes repas
      </button>
    </Sheet>
  )
}
