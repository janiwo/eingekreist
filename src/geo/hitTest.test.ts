import type { MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
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
