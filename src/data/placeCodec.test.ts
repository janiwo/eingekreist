import { describe, expect, it } from 'vitest'
import type { Place } from '../game/types'
import { decodePlaces, decodeRing, encodePlaces, encodeRing } from './placeCodec'

describe('ring encoding', () => {
  it('stores the first point absolute and the rest as deltas', () => {
    expect(encodeRing([[13.4, 52.5], [13.401, 52.499], [13.4, 52.5]], 3)).toEqual([
      13400, 52500, 1, -1, -1, 1,
    ])
  })

  it('round-trips exactly at the given precision', () => {
    const ring = [[-179.999, -89.5], [0.1, 0.2], [179.999, 89.999], [-179.999, -89.5]]
    expect(decodeRing(encodeRing(ring, 3), 3)).toEqual(ring)
  })
})

describe('place file', () => {
  const places: Place[] = [
    {
      id: 'square',
      name: { de: 'Quadrat', en: 'Square' },
      category: 'landscape',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    },
    {
      id: 'two-parts',
      name: { de: 'Zwei Teile', en: 'Two parts' },
      qualifier: { de: 'Test', en: 'Test' },
      category: 'island',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]],
      },
    },
  ]

  it('round-trips places with Polygon and MultiPolygon geometry', () => {
    expect(decodePlaces(encodePlaces(places, 3))).toEqual(places)
  })

  it('rejects unknown formats', () => {
    expect(() => decodePlaces({ ...encodePlaces(places, 3), version: 1 as 2 })).toThrow(/format/)
  })
})
