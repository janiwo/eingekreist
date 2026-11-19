import { encodePlaces } from '../../src/data/placeCodec.ts'
import type { Place } from '../../src/game/types.ts'
import { COORD_DECIMALS } from './geometry.ts'

export const PLACES_FILE = 'src/data/places.json'

/** Encoded, one place per line, so diffs of the generated file stay readable. */
export function serializePlaces(places: Place[]): string {
  const { places: encoded, ...header } = encodePlaces(places, COORD_DECIMALS)
  const head = JSON.stringify(header).slice(0, -1)
  return `${head},"places":[\n${encoded.map((p) => JSON.stringify(p)).join(',\n')}\n]}\n`
}
