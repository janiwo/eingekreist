import { describe, expect, it } from 'vitest'
import { circleFeatures } from './circleLayer'

describe('circleFeatures', () => {
  it('emits an area and an outline per circle, each carrying its color', () => {
    const fc = circleFeatures([
      { circle: { center: [0, 0], radiusKm: 100 }, color: '#f00' },
      { circle: { center: [20, 85], radiusKm: 1000 }, color: '#00f' },
    ])
    expect(fc.features.map((f) => [f.geometry.type, f.properties?.color])).toEqual([
      ['Polygon', '#f00'],
      ['LineString', '#f00'],
      ['Polygon', '#00f'],
      ['LineString', '#00f'],
    ])
  })

  it('is empty without circles', () => {
    expect(circleFeatures([]).features).toEqual([])
  })
})
