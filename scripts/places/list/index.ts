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

/**
 * The curated place list (spec §4). Edit the per-category files and the English names in
 * `en.ts`, then `npm run build:places`. A missing English name is left empty, which the
 * validation reports.
 */
export const placeSources: PlaceSource[] = Object.entries(lists).flatMap(([category, entries]) =>
  entries.map(({ name, qualifier, ...e }) => {
    const t: Translation | undefined = english[e.id]
    const en: { name?: string; qualifier?: string } = typeof t === 'string' ? { name: t } : (t ?? {})
    return {
      ...e,
      name: { de: name, en: en.name ?? '' },
      ...(qualifier && { qualifier: { de: qualifier, en: en.qualifier ?? '' } }),
      category: category as Category,
    }
  }),
)
