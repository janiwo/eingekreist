import { describe, expect, it } from 'vitest'
import borders from './basemap/borders.json'
import land from './basemap/land.json'
import { decodeLines, decodePolygons, encodeLines, encodePolygons, type LineFile, type PolygonFile } from './basemapCodec'

const inWorld = (coords: number[][]) =>
  coords.every(([lng, lat]) => Math.abs(lng) <= 180 && Math.abs(lat) <= 90)

describe('base map codec', () => {
  it('round-trips polygons with holes', () => {
    const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    const hole = [[2, 2], [2, 3.5], [3.25, 3.5], [2, 2]]
    const [f] = decodePolygons(encodePolygons([[square, hole]], 3)).features
    expect(f.geometry).toEqual({ type: 'MultiPolygon', coordinates: [[square, hole]] })
  })

  it('round-trips lines across the antimeridian', () => {
    const line = [[179.5, -16.1], [-179.75, -16.2]]
    const [f] = decodeLines(encodeLines([line], 3)).features
    expect(f.geometry).toEqual({ type: 'MultiLineString', coordinates: [line] })
  })

  it('rejects unknown formats', () => {
    expect(() => decodeLines({ format: 'x', version: 1 } as unknown as LineFile)).toThrow()
  })

  it('decodes the generated base map within world bounds', () => {
    const landCoords = decodePolygons(land as PolygonFile).features[0].geometry.coordinates.flat(2)
    const borderCoords = decodeLines(borders as LineFile).features[0].geometry.coordinates.flat()
    for (const coords of [landCoords, borderCoords]) {
      expect(coords.length).toBeGreaterThan(10_000)
      expect(inWorld(coords)).toBe(true)
    }
  })
})
