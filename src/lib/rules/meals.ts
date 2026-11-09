import type { Recipe, RecipeTag } from '../../db/types'

// Pour comparer « Œufs » et « oeuf », « épinards » et « epinard »…
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .trim()
}

export function isExcluded(recipe: Pick<Recipe, 'name' | 'ingredients'>, excluded: string[]): boolean {
  // Mot entier, au singulier ou au pluriel : « pois » ne doit pas exclure « poivron ».
  const patterns = excluded
    .map(normalize)
    .filter(Boolean)
    .map((w) => new RegExp(`\\b${w.replace(/s$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`))
  if (patterns.length === 0) return false
  const haystack = normalize([recipe.name, ...recipe.ingredients].join(' | '))
  return patterns.some((p) => p.test(haystack))
}

// Les recettes qui comblent le mieux les calories et protéines restantes.
export function suggestRecipes(
  recipes: Recipe[],
  remaining: { kcal: number; protein: number },
  tag: RecipeTag | null,
  excluded: string[],
  count = 3,
): Recipe[] {
  const kcalLeft = Math.max(remaining.kcal, 150)
  const protLeft = Math.max(remaining.protein, 0)
  const pool = recipes.filter((r) => !r.deleted && (!tag || r.tags.includes(tag)) && !isExcluded(r, excluded))

  const score = (r: Recipe) => {
    const over = r.kcal > kcalLeft
    const kcalGap = (Math.abs(r.kcal - kcalLeft) / kcalLeft) * (over ? 1.5 : 1)
    const protGap = protLeft > 0 ? Math.max(0, protLeft - r.protein) / Math.max(protLeft, 20) : 0
    return kcalGap + protGap
  }
  return [...pool].sort((a, b) => score(a) - score(b)).slice(0, count)
}
