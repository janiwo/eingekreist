import { describe, expect, it } from 'vitest'
import { drawPlace, poolOf, type PlacePool } from './draw'
import { nextRandom } from './rng'
import type { Category } from './types'

const pool: PlacePool = {
  country: Array.from({ length: 100 }, (_, i) => `country-${i}`),
  city: ['city-a', 'city-b'],
  water: ['water-a'],
}

describe('nextRandom', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    let a = 42
    let b = 42
    for (let i = 0; i < 1000; i++) {
      const [va, na] = nextRandom(a)
      const [vb, nb] = nextRandom(b)
      expect(va).toBe(vb)
      expect(va).toBeGreaterThanOrEqual(0)
      expect(va).toBeLessThan(1)
      a = na
      b = nb
    }
  })

  it('differs between seeds', () => {
    expect(nextRandom(1)[0]).not.toBe(nextRandom(2)[0])
  })
})

describe('drawPlace', () => {
  it('returns the same place for the same seed', () => {
    const a = drawPlace(pool, ['country', 'city'], [], 7)
    const b = drawPlace(pool, ['country', 'city'], [], 7)
    expect(a).toEqual(b)
  })

  it('draws the category uniformly, not weighted by its size', () => {
    // 100 countries vs. 2 cities: per-place drawing would almost never pick a city.
    const counts: Partial<Record<Category, number>> = {}
    let rng = 1
    for (let i = 0; i < 4000; i++) {
      const d = drawPlace(pool, ['country', 'city'], [], rng)!
      counts[d.category] = (counts[d.category] ?? 0) + 1
      rng = d.rng
    }
    expect(counts.country! / 4000).toBeCloseTo(0.5, 1)
    expect(counts.city! / 4000).toBeCloseTo(0.5, 1)
  })

  it('only draws from active categories', () => {
    let rng = 3
    for (let i = 0; i < 200; i++) {
      const d = drawPlace(pool, ['water', 'city'], [], rng)!
      expect(['water', 'city']).toContain(d.category)
      expect(d.placeId).toMatch(/^(water|city)-/)
      rng = d.rng
    }
  })

  it('never repeats a place and skips used-up categories', () => {
    const used: string[] = []
    let rng = 99
    for (let i = 0; i < 103; i++) {
      const d = drawPlace(pool, ['country', 'city', 'water'], used, rng)!
      expect(used).not.toContain(d.placeId)
      used.push(d.placeId)
      rng = d.rng
    }
    expect(new Set(used).size).toBe(103)
    expect(drawPlace(pool, ['country', 'city', 'water'], used, rng)).toBeNull()
  })

  it('returns null for categories without places', () => {
    expect(drawPlace(pool, ['landmark'], [], 1)).toBeNull()
  })
})

describe('poolOf', () => {
  it('groups place IDs by category', () => {
    expect(
      poolOf([
        { id: 'a', category: 'city' },
        { id: 'b', category: 'country' },
        { id: 'c', category: 'city' },
      ]),
    ).toEqual({ city: ['a', 'c'], country: ['b'] })
  })
})
