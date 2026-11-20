import type { MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { MAX_RADIUS_KM } from './circle'
import { circleHits, distanceToAreaKm } from './hitTest'

// 1°×1° square on the equator (0..1° E, 0..1° N)
const square: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
}

const twoParts: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [square.coordinates, [[[50, 0], [51, 0], [51, 1], [50, 1], [50, 0]]]],
}

describe('distanceToAreaKm', () => {
  it('is 0 inside', () => {
    expect(distanceToAreaKm([0.5, 0.5], square)).toBe(0)
  })

  it('measures the distance to the nearest edge', () => {
    // 1° of longitude at the equator ≈ 111.3 km
    expect(distanceToAreaKm([2, 0.5], square)).toBeCloseTo(111.3, 0)
  })

  it('uses the nearest part of a MultiPolygon', () => {
    expect(distanceToAreaKm([52, 0.5], twoParts)).toBeCloseTo(111.3, 0)
  })
})

describe('circleHits', () => {
  it('hits when touching from outside', () => {
    expect(circleHits({ center: [2, 0.5], radiusKm: 112 }, square)).toBe(true)
  })

  it('misses narrowly', () => {
    expect(circleHits({ center: [2, 0.5], radiusKm: 110 }, square)).toBe(false)
  })

  it('hits when the center is inside', () => {
    expect(circleHits({ center: [0.5, 0.5], radiusKm: 1 }, square)).toBe(true)
  })
})

describe('circles the e2e tests rely on', async () => {
  const { loadPlaces } = await import('../data/places')
  const places = await loadPlaces()

  it('a circle of the maximum radius around (0, 0) hits every place', () => {
    const misses = places.filter((p) => !circleHits({ center: [0, 0], radiusKm: MAX_RADIUS_KM }, p.geometry))
    expect(misses.map((p) => p.id)).toEqual([])
  })

  it('a 1 km circle in the far South Pacific hits no place', () => {
    const hits = places.filter((p) => circleHits({ center: [-150, -60], radiusKm: 1 }, p.geometry))
    expect(hits.map((p) => p.id)).toEqual([])
  })
})
