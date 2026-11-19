import type { Place } from '../game/types'

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/**
 * Looks up a place by ID or name: exact ID first, then exact name, then the first name
 * starting with the query. Case and diacritics are ignored for names.
 */
export function findPlace(places: Place[], query: string): Place | undefined {
  const q = normalize(query)
  if (!q) return undefined
  return (
    places.find((p) => p.id === query.trim()) ??
    places.find((p) => normalize(p.name) === q) ??
    places.find((p) => normalize(p.name).startsWith(q))
  )
}
