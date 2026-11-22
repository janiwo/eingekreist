import { describe, expect, it } from 'vitest'
import { zoomForRadius } from './view'

describe('zoomForRadius', () => {
  it('puts 1 km on 32 px at the equator around zoom 11.3', () => {
    expect(zoomForRadius(1, 32, 0)).toBeCloseTo(11.29, 1)
  })

  it('needs one zoom level less for twice the radius', () => {
    expect(zoomForRadius(2, 32, 10)).toBeCloseTo(zoomForRadius(1, 32, 10) - 1, 6)
  })

  it('needs less zoom towards the poles, where Mercator stretches the map', () => {
    expect(zoomForRadius(1, 32, 60)).toBeCloseTo(zoomForRadius(1, 32, 0) - 1, 6)
    expect(zoomForRadius(1, 32, -60)).toBeCloseTo(zoomForRadius(1, 32, 60), 6)
  })

  it('stays finite at the pole', () => {
    expect(Number.isFinite(zoomForRadius(1, 32, 90))).toBe(true)
  })
})
