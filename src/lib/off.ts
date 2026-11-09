import { normalize } from './rules/meals'

// Open Food Facts : base d'aliments libre et gratuite. Nécessite le réseau.
// Limite de l'API : environ 10 recherches par minute, d'où une recherche seulement sur demande.

export interface OffProduct {
  code: string
  name: string
  brand: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const BASE = 'https://world.openfoodfacts.org'
const FIELDS = 'code,product_name,product_name_fr,brands,nutriments'

type Raw = {
  code?: string
  product_name?: string
  product_name_fr?: string
  brands?: string
  nutriments?: Record<string, number | string | undefined>
}

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)
const r1 = (n: number) => Math.round(n * 10) / 10

function toProduct(p: Raw): OffProduct | null {
  const n = p.nutriments ?? {}
  let kcal = num(n['energy-kcal_100g'])
  if (!Number.isFinite(kcal)) kcal = num(n['energy_100g']) / 4.184 // valeur en kJ
  const name = (p.product_name_fr || p.product_name || '').trim()
  if (!name || !Number.isFinite(kcal)) return null
  const v = (k: string) => {
    const x = num(n[k])
    return Number.isFinite(x) ? r1(x) : 0
  }
  return {
    code: p.code ?? '',
    name,
    brand: (p.brands ?? '').split(',')[0].trim(),
    kcal: Math.round(kcal),
    protein: v('proteins_100g'),
    carbs: v('carbohydrates_100g'),
    fat: v('fat_100g'),
  }
}

async function getJson(url: string, signal?: AbortSignal) {
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    // Réseau coupé, ou limite de recherches dépassée (la réponse est alors bloquée par le navigateur)
    throw new Error('Open Food Facts ne répond pas. Vérifie le réseau ou réessaie dans une minute.')
  }
  if (!res.ok) throw new Error(res.status === 429 ? 'Trop de recherches : attends une minute.' : `Erreur ${res.status}`)
  return res.json()
}

// La recherche d'Open Food Facts mélange les produits proches (« skyr » renvoie des fromages blancs) :
// on remonte ceux dont le nom contient tous les mots cherchés, puis au moins un.
export function rankByName(products: OffProduct[], query: string): OffProduct[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const score = (p: OffProduct) => {
    const name = normalize(`${p.name} ${p.brand}`)
    const hits = words.filter((w) => name.includes(w)).length
    return hits === words.length ? 2 : hits > 0 ? 1 : 0
  }
  return products
    .map((p, i) => ({ p, i, s: score(p) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p)
}

export async function searchOff(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '24',
    fields: FIELDS,
    lc: 'fr',
    cc: 'fr',
  })
  const data = await getJson(`${BASE}/cgi/search.pl?${params}`, signal)
  const products = ((data.products ?? []) as Raw[]).map(toProduct).filter((p): p is OffProduct => !!p)
  return rankByName(products, query)
}

export async function fetchBarcode(code: string, signal?: AbortSignal): Promise<OffProduct | null> {
  const clean = code.replace(/\D/g, '')
  if (!clean) return null
  const data = await getJson(`${BASE}/api/v2/product/${clean}?fields=${FIELDS}`, signal)
  if (data.status !== 1 || !data.product) return null
  return toProduct({ code: clean, ...data.product })
}
