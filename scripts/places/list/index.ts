import type { Category } from '../../../src/game/types.ts'
import type { Entry, PlaceSource } from '../types.ts'
import { cities } from './cities.ts'
import { countries } from './countries.ts'
import { islands } from './islands.ts'
import { landmarks } from './landmarks.ts'
import { landscapes } from './landscapes.ts'
import { waters } from './waters.ts'

const lists: Record<Category, Entry[]> = {
  country: countries,
  city: cities,
  island: islands,
  landscape: landscapes,
  water: waters,
  landmark: landmarks,
}

/** The curated place list (spec §4). Edit the per-category files, then `npm run build:places`. */
export const placeSources: PlaceSource[] = Object.entries(lists).flatMap(([category, entries]) =>
  entries.map((e) => ({ ...e, category: category as Category })),
)
