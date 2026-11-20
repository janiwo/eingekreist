import { describe, expect, it } from 'vitest'
import borders from './basemap/borders.json'
import land from './basemap/land.json'
import { decodeBaseMap, encodeLines, encodePolygons, type BaseMapFile } from './basemapCodec'

describe('base map codec', () => {
  it('round-trips polygons with holes', () => {
    const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    const hole = [[2, 2], [2, 3.5], [3.25, 3.5], [2, 2]]
    const [f] = decodeBaseMap(encodePolygons([[square, hole]], 3)).features
    expect(f.geometry).toEqual({ type: 'MultiPolygon', coordinates: [[square, hole]] })
  })

  it('round-trips lines across the antimeridian', () => {
    const line = [[179.5, -16.1], [-179.75, -16.2]]
    const [f] = decodeBaseMap(encodeLines([line], 3)).features
    expect(f.geometry).toEqual({ type: 'MultiLineString', coordinates: [line] })
  })

  it('rejects unknown formats', () => {
    expect(() => decodeBaseMap({ format: 'x', version: 1 } as unknown as BaseMapFile)).toThrow()
  })

  it('decodes the generated base map within world bounds', () => {
    for (const file of [land, borders]) {
      const [f] = decodeBaseMap(file as BaseMapFile).features
      const coords = f.geometry.coordinates.flat(f.geometry.type === 'MultiPolygon' ? 2 : 1) as number[][]
      expect(coords.length).toBeGreaterThan(10_000)
      for (const [lng, lat] of coords) {
        expect(Math.abs(lng)).toBeLessThanOrEqual(180)
        expect(Math.abs(lat)).toBeLessThanOrEqual(90)
      }
    }
  })
})
