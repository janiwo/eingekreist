import { nextInt, type RngState } from './rng'
import type { Category, Place } from './types'

/** Place IDs per category: everything the drawing needs to know about the dataset. */
export type PlacePool = Partial<Record<Category, readonly string[]>>

export function poolOf(places: readonly Pick<Place, 'id' | 'category'>[]): PlacePool {
  const pool: Partial<Record<Category, string[]>> = {}
  for (const p of places) (pool[p.category] ??= []).push(p.id)
  return pool
}

export interface Draw {
  placeId: string
  category: Category
  rng: RngState
}

/**
 * Two-stage draw (spec §4.2): first one of the active categories uniformly, then a place from
 * it uniformly. Places in `used` are never drawn again; categories without unused places are
 * left out of the first stage. Returns `null` when no unused place is left.
 */
export function drawPlace(
  pool: PlacePool,
  categories: readonly Category[],
  used: readonly string[],
  rng: RngState,
): Draw | null {
  const usedSet = new Set(used)
  const candidates = categories
    .map((category) => ({ category, ids: (pool[category] ?? []).filter((id) => !usedSet.has(id)) }))
    .filter((c) => c.ids.length > 0)
  if (candidates.length === 0) return null

  const [ci, rng1] = nextInt(rng, candidates.length)
  const { category, ids } = candidates[ci]
  const [pi, rng2] = nextInt(rng1, ids.length)
  return { placeId: ids[pi], category, rng: rng2 }
}
