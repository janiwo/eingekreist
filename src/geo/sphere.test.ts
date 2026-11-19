import { describe, expect, it } from 'vitest'
import { bearingDeg, destination, distanceKm, normalizeLng } from './sphere'

describe('sphere', () => {
  it('normalizes longitudes', () => {
    expect(normalizeLng(190)).toBe(-170)
    expect(normalizeLng(-190)).toBe(170)
    expect(normalizeLng(540)).toBe(-180)
    expect(normalizeLng(10)).toBe(10)
  })

  it('measures distances', () => {
    expect(distanceKm([0, 0], [1, 0])).toBeCloseTo(111.2, 0)
    expect(distanceKm([179.5, 0], [-179.5, 0])).toBeCloseTo(111.2, 0)
  })

  it('computes bearings', () => {
    expect(bearingDeg([0, 0], [0, 10])).toBeCloseTo(0)
    expect(bearingDeg([0, 0], [10, 0])).toBeCloseTo(90)
  })

  it('round-trips destination and distance', () => {
    const p = destination([179, 10], 500, 75)
    expect(p[0]).toBeLessThan(0) // crossed the antimeridian
    expect(distanceKm([179, 10], p)).toBeCloseTo(500, 6)
    expect(bearingDeg([179, 10], p)).toBeCloseTo(75, 6)
  })
})
