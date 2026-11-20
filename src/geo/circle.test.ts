import { booleanClockwise } from '@turf/boolean-clockwise'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import type { Position } from 'geojson'
import { describe, expect, it } from 'vitest'
import { MIN_RADIUS_KM, type Circle, type LngLat } from '../game/types'
import { MAX_RADIUS_KM, circleOutline, circlePolygon, initialRadiusKm, roundRadiusKm, stepRadiusKm } from './circle'
import { distanceKm, normalizeLng } from './sphere'

/** Point-in-circle check that, like MapLibre, treats longitudes beyond ±180° as wrapped. */
const inside = (circle: Circle, [lng, lat]: LngLat) => {
  const poly = circlePolygon(circle)
  return [-360, 0, 360].some((shift) => booleanPointInPolygon(point([lng + shift, lat]), poly))
}

/** Ring vertices that lie on the circle (excludes the pole closing points). */
const onCircle = (ring: Position[]) => ring.filter((p) => Math.abs(p[1]) !== 90)

describe('roundRadiusKm', () => {
  it('enforces the minimum radius of 1 km', () => {
    expect(roundRadiusKm(0)).toBe(MIN_RADIUS_KM)
    expect(roundRadiusKm(0.4)).toBe(1)
    expect(roundRadiusKm(-5)).toBe(1)
  })

  it('caps at the maximum radius', () => {
    expect(roundRadiusKm(50_000)).toBe(MAX_RADIUS_KM)
  })

  it('rounds to about three significant digits', () => {
    expect(roundRadiusKm(3.14159)).toBe(3.1)
    expect(roundRadiusKm(42.6)).toBe(43)
    expect(roundRadiusKm(999.4)).toBe(999)
    expect(roundRadiusKm(1234)).toBe(1230)
    expect(roundRadiusKm(12_345)).toBe(12_300)
  })
})

describe('initialRadiusKm', () => {
  it('is a tenth of the viewport', () => {
    expect(initialRadiusKm(20, 800)).toBe(1600)
  })

  it('never goes below the minimum', () => {
    expect(initialRadiusKm(0.001, 400)).toBe(1)
  })
})

describe('circlePolygon', () => {
  it('is a closed ring with all vertices at the radius', () => {
    const circle: Circle = { center: [10, 50], radiusKm: 300 }
    const [ring] = circlePolygon(circle, 64).coordinates
    expect(ring).toHaveLength(65)
    expect(ring[0]).toEqual(ring[ring.length - 1])
    for (const p of ring) expect(distanceKm(circle.center, p as LngLat)).toBeCloseTo(300, 6)
  })

  it('is geodesic: near the poles it spans more longitude than latitude', () => {
    const [ring] = circlePolygon({ center: [0, 70], radiusKm: 500 }).coordinates
    const lngs = ring.map((p) => p[0])
    const lats = ring.map((p) => p[1])
    const lngSpan = Math.max(...lngs) - Math.min(...lngs)
    const latSpan = Math.max(...lats) - Math.min(...lats)
    expect(lngSpan).toBeGreaterThan(2 * latSpan)
  })

  it('winds the exterior ring counter-clockwise', () => {
    const [ring] = circlePolygon({ center: [0, 0], radiusKm: 100 }).coordinates
    expect(booleanClockwise(ring)).toBe(false)
  })

  it('keeps an antimeridian circle as one continuous ring', () => {
    const circle: Circle = { center: [179.5, 0], radiusKm: 200 }
    const [ring] = circlePolygon(circle).coordinates
    for (let i = 1; i < ring.length; i++)
      expect(Math.abs(ring[i][0] - ring[i - 1][0])).toBeLessThan(180)
    for (const p of ring)
      expect(distanceKm(circle.center, [normalizeLng(p[0]), p[1]])).toBeCloseTo(200, 6)
    expect(inside(circle, [179.9, 0.5])).toBe(true)
  })

  it('closes a circle around the north pole along the pole', () => {
    const circle: Circle = { center: [30, 85], radiusKm: 1000 }
    const [ring] = circlePolygon(circle).coordinates
    expect(ring.filter((p) => p[1] === 90)).toHaveLength(2)
    const lngs = ring.map((p) => p[0])
    expect(Math.max(...lngs) - Math.min(...lngs)).toBeCloseTo(360, 6)
    for (const p of onCircle(ring))
      expect(distanceKm(circle.center, [normalizeLng(p[0]), p[1]])).toBeCloseTo(1000, 6)
    expect(inside(circle, [0, 89])).toBe(true)
    expect(inside(circle, [210, 89])).toBe(true)
    expect(inside(circle, [30, 70])).toBe(false)
  })

  it('closes a circle around the south pole along the pole', () => {
    const circle: Circle = { center: [-100, -80], radiusKm: 1500 }
    const [ring] = circlePolygon(circle).coordinates
    expect(ring.filter((p) => p[1] === -90)).toHaveLength(2)
    expect(inside(circle, [80, -88])).toBe(true)
    // Right next to the seam meridian (where the ring starts and ends).
    const seam = ring[0][0]
    expect(inside(circle, [seam + 0.5, -86])).toBe(true)
    expect(inside(circle, [seam - 0.5, -86])).toBe(true)
    expect(inside(circle, [-100, -60])).toBe(false)
  })

  it('covers the world minus the antipodal cap when both poles are inside', () => {
    const circle: Circle = { center: [0, 0], radiusKm: 15_000 }
    const poly = circlePolygon(circle)
    expect(poly.coordinates).toHaveLength(2)
    expect(inside(circle, [0, 0])).toBe(true)
    expect(inside(circle, [90, 60])).toBe(true)
    expect(inside(circle, [180, 0])).toBe(false) // antipode lies outside
    for (const p of poly.coordinates[1])
      expect(distanceKm(circle.center, p as LngLat)).toBeCloseTo(15_000, 4)
  })
})

describe('circleOutline', () => {
  it.each<[string, Circle]>([
    ['equator', { center: [10, 0], radiusKm: 2000 }],
    ['antimeridian', { center: [179, 10], radiusKm: 1200 }],
    ['north pole', { center: [20, 82], radiusKm: 1500 }],
    ['both poles', { center: [10, 20], radiusKm: 14_000 }],
  ])('follows only the circle (%s)', (_, circle) => {
    const ring = circleOutline(circle, 64).coordinates
    expect(ring).toHaveLength(65)
    for (const p of ring) {
      expect(distanceKm(circle.center, [normalizeLng(p[0]), p[1]])).toBeCloseTo(circle.radiusKm, 4)
    }
    for (let i = 1; i < ring.length; i++)
      expect(Math.abs(ring[i][0] - ring[i - 1][0])).toBeLessThan(180)
  })
})

describe('stepRadiusKm', () => {
  it('grows and shrinks by about 5 % (25 % with Shift)', () => {
    expect(stepRadiusKm(400, 1)).toBe(420)
    expect(stepRadiusKm(420, -1)).toBe(400)
    expect(stepRadiusKm(400, 1, true)).toBe(500)
    expect(stepRadiusKm(500, -1, true)).toBe(400)
  })

  it('always changes the radius between the limits', () => {
    for (let km = MIN_RADIUS_KM; km < MAX_RADIUS_KM; km = stepRadiusKm(km, 1)) {
      expect(stepRadiusKm(km, 1)).toBeGreaterThan(km)
    }
    for (let km = MAX_RADIUS_KM; km > MIN_RADIUS_KM; km = stepRadiusKm(km, -1)) {
      expect(stepRadiusKm(km, -1)).toBeLessThan(km)
    }
  })

  it('stays within the limits', () => {
    expect(stepRadiusKm(MIN_RADIUS_KM, -1, true)).toBe(MIN_RADIUS_KM)
    expect(stepRadiusKm(MAX_RADIUS_KM, 1, true)).toBe(MAX_RADIUS_KM)
  })
})
