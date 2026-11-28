import type { Category } from '../../../src/game/types.ts'
import type { Entry, PlaceSource, Translation } from '../types.ts'
import { cities } from './cities.ts'
import { countries } from './countries.ts'
import { english } from './en.ts'
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

const nameOf = (t: Translation | undefined) => (typeof t === 'string' ? t : (t?.name ?? ''))

/**
 * The curated place list (spec §4). Edit the per-category files and the English names in
 * `en.ts`, then `npm run build:places`. A missing English name is left empty, which the
 * validation reports.
 */
export const placeSources: PlaceSource[] = Object.entries(lists).flatMap(([category, entries]) =>
  entries.map(({ name, qualifier, ...e }) => {
    const en = english[e.id]
    return {
      ...e,
      name: { de: name, en: nameOf(en) },
      ...(qualifier && { qualifier: { de: qualifier, en: typeof en === 'object' ? en.qualifier : '' } }),
      category: category as Category,
    }
  }),
)
