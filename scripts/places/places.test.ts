import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodePlaces, type PlaceFile } from '../../src/data/placeCodec'
import { loadPlaces } from '../../src/data/places'
import type { Circle, LngLat, Place } from '../../src/game/types'
import { circleHits } from '../../src/geo/hitTest'
import { PLACES_FILE } from './output'
import { formatReport, validatePlaces } from './validate'

const json = readFileSync(PLACES_FILE, 'utf8')
const places = decodePlaces(JSON.parse(json) as PlaceFile)
const byId = new Map(places.map((p) => [p.id, p]))

function place(id: string): Place {
  const p = byId.get(id)
  if (!p) throw new Error(`no place ${id}`)
  return p
}

const hits = (id: string, center: LngLat, radiusKm: number) =>
  circleHits({ center, radiusKm } satisfies Circle, place(id).geometry)

describe('place dataset', () => {
  it('passes validation', () => {
    const report = validatePlaces(places, json)
    expect(report.errors, formatReport(report)).toEqual([])
  })

  it('rejects a ring that wraps around the antimeridian instead of being cut', () => {
    const wrapped: Place = {
      id: 'wrapped',
      name: 'Kaputt',
      category: 'landmark',
      geometry: { type: 'Polygon', coordinates: [[[179.9, 0], [-179.9, 0], [-179.9, 1], [179.9, 0]]] },
    }
    expect(validatePlaces([wrapped], '').errors).toContain('wrapped: edge across the antimeridian at -179.9,0')
  })

  it('loads through loadPlaces', async () => {
    // The codec round trip itself is covered in placeCodec.test.ts.
    expect((await loadPlaces()).map((p) => p.id)).toEqual(places.map((p) => p.id))
  })
})

describe('hit test on real places', () => {
  it('counts overseas departments as part of their country', () => {
    // Saint-Denis, Réunion
    expect(hits('france', [55.45, -20.88], 1)).toBe(true)
  })

  it('does not count dependencies with their own status', () => {
    // Nuuk, Greenland: far from any part of Denmark
    expect(hits('denmark', [-51.72, 64.18], 100)).toBe(false)
    expect(hits('greenland', [-51.72, 64.18], 1)).toBe(true)
  })

  it('handles Russia on both sides of the antimeridian', () => {
    // Chukotka, just either side of 180°
    expect(hits('russia', [179.9, 67.5], 1)).toBe(true)
    expect(hits('russia', [-179.9, 67.5], 1)).toBe(true)
    // A circle across the seam, from the sea off the coast
    expect(hits('russia', [180, 64.5], 1)).toBe(false)
    expect(hits('russia', [20.5, 54.7], 1)).toBe(true) // Kaliningrad exclave
  })

  it('measures the distance to the nearest border', () => {
    // Basel city centre, about 3 km from the German border
    expect(hits('germany', [7.588, 47.558], 1)).toBe(false)
    expect(hits('germany', [7.588, 47.558], 6)).toBe(true)
  })

  it('finds tiny countries', () => {
    expect(hits('vatican-city', [12.4534, 41.9022], 1)).toBe(true) // St. Peter's
    expect(hits('monaco', [7.42, 43.735], 1)).toBe(true)
  })

  it('uses city boundaries', () => {
    expect(hits('berlin', [13.405, 52.52], 1)).toBe(true)
    expect(hits('berlin', [11.576, 48.137], 100)).toBe(false) // Munich
    // Tokyo without its Pacific islands: Hachijō-jima is far from the city
    expect(hits('tokyo', [139.78, 33.11], 50)).toBe(false)
    // Clipped to land: the Java Sea off Jakarta and the Hauraki Gulf don't count
    expect(hits('jakarta', [106.6, -5.5], 1)).toBe(false)
    expect(hits('auckland', [175.0, -36.5], 1)).toBe(false)
  })

  it('buffers rivers', () => {
    // Cologne Cathedral, ~400 m from the Rhine
    expect(hits('rhine', [6.9583, 50.9413], 1)).toBe(true)
    expect(hits('nile', [31.2357, 30.0444], 1)).toBe(true) // Cairo
  })

  it('buffers landmarks', () => {
    // The Louvre is ~3.2 km from the Eiffel Tower, whose buffer is 1 km
    expect(hits('eiffel-tower', [2.3376, 48.8606], 1.5)).toBe(false)
    expect(hits('eiffel-tower', [2.3376, 48.8606], 3)).toBe(true)
  })

  it('merges several Natural Earth features into one place', () => {
    // The Adriatic belongs to the Mediterranean
    expect(hits('mediterranean-sea', [15, 43], 1)).toBe(true)
    expect(hits('baltic-sea', [21, 63], 1)).toBe(true) // Gulf of Bothnia
  })

  it('uses Natural Earth outlines for fuzzy places', () => {
    expect(hits('sahara', [10, 25], 1)).toBe(true)
    expect(hits('sahara', [10, 50], 500)).toBe(false)
    // Island groups include their outliers (Darwin Island, Galápagos)
    expect(hits('galapagos', [-92.0, 1.67], 2)).toBe(true)
  })
})
