import { describe, expect, it } from 'vitest'
import { CIRCLE_MAX_ZOOM, circleCamera, zoomForRadius } from './view'

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

  it('keeps the scale of the Mercator limit beyond it, like the globe', () => {
    expect(zoomForRadius(1, 32, 90)).toBeCloseTo(zoomForRadius(1, 32, 85.051129), 6)
    expect(zoomForRadius(1, 32, -88)).toBeCloseTo(zoomForRadius(1, 32, 85.051129), 6)
    expect(zoomForRadius(1, 32, 88)).toBeLessThan(zoomForRadius(1, 32, 0))
  })
})

describe('circleCamera', () => {
  const none = { top: 0, bottom: 0, left: 0, right: 0 }

  it('centers on the circle and fits its diameter into 80 % of the shorter side', () => {
    const camera = circleCamera([10, 0], 100, none, 1000, 500)
    expect(camera.center).toEqual([10, 0])
    expect(camera.zoom).toBeCloseTo(zoomForRadius(100, 200, 0), 6)
    expect(camera.offset).toEqual([0, 0])
  })

  it('fits into the free area and shifts the center into it', () => {
    const camera = circleCamera([0, 0], 100, { top: 100, bottom: 300, left: 20, right: 20 }, 400, 800)
    // Free: 360 × 400 px.
    expect(camera.zoom).toBeCloseTo(zoomForRadius(100, 144, 0), 6)
    expect(camera.offset).toEqual([0, -100])
  })

  it('zooms in at most to CIRCLE_MAX_ZOOM, even for the 1 km minimum', () => {
    expect(circleCamera([0, 0], 1, none, 2000, 2000).zoom).toBe(CIRCLE_MAX_ZOOM)
  })

  it('does not zoom out past the whole globe for huge circles, at any latitude', () => {
    expect(circleCamera([0, 0], 20_000, none, 400, 400).zoom).toBe(1)
    // The globe's zoom shifts with latitude: at 60° one level less is the same view.
    expect(circleCamera([0, 60], 20_000, none, 400, 400).zoom).toBeCloseTo(0, 6)
  })

  it('tells small polar circles apart', () => {
    const small = circleCamera([30, 88], 200, none, 1000, 600).zoom
    expect(circleCamera([30, 88], 300, none, 1000, 600).zoom).toBeCloseTo(small - Math.log2(1.5), 6)
  })

  it('stays finite with no free space', () => {
    const camera = circleCamera([0, 90], 500, { top: 500, bottom: 500, left: 0, right: 0 }, 400, 400)
    expect(Number.isFinite(camera.zoom)).toBe(true)
  })
})
