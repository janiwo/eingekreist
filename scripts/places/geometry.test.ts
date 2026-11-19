import type { Position } from 'geojson'
import { describe, expect, it } from 'vitest'
import { distanceKm } from '../../src/geo/sphere'
import {
  bufferLines,
  bufferPoint,
  chunkLine,
  crossings,
  excludeParts,
  finalize,
  roundPolys,
  simplifyPolys,
  type Polys,
} from './geometry'

const square = (x: number, y: number, size = 1): Position[] => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
]

describe('excludeParts', () => {
  const polys: Polys = [[square(0, 0)], [square(10, 10)]]

  it('drops parts lying completely inside a box', () => {
    expect(excludeParts(polys, [[9, 9, 12, 12]])).toEqual([[square(0, 0)]])
  })

  it('keeps parts that only overlap a box', () => {
    expect(excludeParts(polys, [[10.5, 10.5, 12, 12]])).toHaveLength(2)
  })
})

describe('bufferPoint', () => {
  it('is a closed ring at the given distance', () => {
    const [[ring]] = bufferPoint([13.4, 52.5], 5)
    expect(ring[0]).toEqual(ring[ring.length - 1])
    for (const p of ring) expect(distanceKm([13.4, 52.5], p as [number, number])).toBeCloseTo(5, 6)
  })
})

describe('chunkLine', () => {
  // Along the equator, 1° ≈ 111 km
  const line: Position[] = [0, 1, 2, 3, 4, 5].map((x) => [x, 0])

  it('splits into pieces that share their end points', () => {
    const chunks = chunkLine(line, 200)
    expect(chunks).toEqual([
      [[0, 0], [1, 0], [2, 0]],
      [[2, 0], [3, 0], [4, 0]],
      [[4, 0], [5, 0]],
    ])
  })

  it('keeps a short line whole', () => {
    expect(chunkLine(line, 10_000)).toEqual([line])
  })
})

describe('bufferLines', () => {
  it('merges the chunks into one area around the line', () => {
    const polys = bufferLines([[0, 1, 2, 3, 4, 5].map((x) => [x, 0])], 10)
    expect(polys).toHaveLength(1)
    const lats = polys[0][0].map((p) => p[1])
    // 10 km ≈ 0.09° of latitude
    expect(Math.max(...lats)).toBeCloseTo(0.09, 2)
    expect(Math.min(...lats)).toBeCloseTo(-0.09, 2)
  })
})

describe('simplifyPolys', () => {
  it('removes vertices closer than ~500 m to the outline', () => {
    const wobbly: Position[] = [[0, 0], [0.5, 0.001], [1, 0], [1, 1], [0, 1], [0, 0]]
    expect(simplifyPolys([[wobbly]])[0][0]).toEqual(square(0, 0))
  })

  it('scales the tolerance east-west with latitude', () => {
    // At 70° N, 0.01° of longitude is only ~380 m: below the tolerance, so it goes.
    const ring: Position[] = [[0, 70], [0.01, 70.5], [0, 71], [1, 71], [1, 70], [0, 70]]
    expect(simplifyPolys([[ring]])[0][0]).toHaveLength(5)
  })
})

describe('roundPolys', () => {
  it('rounds to 3 decimals and removes repeated points', () => {
    const ring: Position[] = [[0, 0], [1.00001, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
    expect(roundPolys([[ring]])).toEqual([[square(0, 0)]])
  })

  it('drops polygons whose outer ring collapses, and collapsed holes', () => {
    const tiny = square(5, 5, 0.0001)
    expect(roundPolys([[tiny]])).toEqual([])
    expect(roundPolys([[square(0, 0, 2), tiny]])).toEqual([[square(0, 0, 2)]])
  })
})

describe('crossings', () => {
  it('finds a self-intersecting ring (bow tie)', () => {
    expect(crossings([[[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]]])).toBe(1)
  })

  it('accepts parts that touch at a corner', () => {
    expect(crossings([[square(0, 0)], [square(1, 1)]])).toBe(0)
  })

  it('accepts a hole touching the outer ring at a vertex', () => {
    const hole: Position[] = [[0, 0], [1, 0.5], [1, 1], [0, 0]]
    expect(crossings([[square(0, 0, 2), hole]])).toBe(0)
  })

  it('finds parts sharing an edge', () => {
    expect(crossings([[square(0, 0)], [square(1, 0)]])).toBe(1)
  })
})

describe('finalize', () => {
  it('repairs a self-intersecting ring', () => {
    const bowTie: Position[] = [[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]
    const fixed = finalize([[bowTie]])
    expect(fixed).toHaveLength(2)
    expect(crossings(fixed)).toBe(0)
  })

  it('merges overlapping parts', () => {
    expect(finalize([[square(0, 0)], [square(0.5, 0)]])).toHaveLength(1)
  })
})
