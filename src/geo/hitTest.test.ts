import type { MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { circleHits, distanceToAreaKm } from './hitTest'

// 1°×1°-Quadrat am Äquator (0..1° O, 0..1° N)
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
  it('ist 0 im Inneren', () => {
    expect(distanceToAreaKm([0.5, 0.5], square)).toBe(0)
  })

  it('misst den Abstand zum nächsten Rand', () => {
    // 1° Länge am Äquator ≈ 111,3 km
    expect(distanceToAreaKm([2, 0.5], square)).toBeCloseTo(111.3, 0)
  })

  it('nimmt bei MultiPolygon den nächsten Teil', () => {
    expect(distanceToAreaKm([52, 0.5], twoParts)).toBeCloseTo(111.3, 0)
  })
})

describe('circleHits', () => {
  it('trifft bei Berührung von außen', () => {
    expect(circleHits({ center: [2, 0.5], radiusKm: 112 }, square)).toBe(true)
  })

  it('verfehlt knapp', () => {
    expect(circleHits({ center: [2, 0.5], radiusKm: 110 }, square)).toBe(false)
  })

  it('trifft, wenn der Mittelpunkt innen liegt', () => {
    expect(circleHits({ center: [0.5, 0.5], radiusKm: 1 }, square)).toBe(true)
  })
})
