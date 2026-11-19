import type { Position } from 'geojson'
// Explicit .ts extensions: the place build scripts run this module in plain Node.
import type { Place } from '../game/types.ts'
import { polygonsOf, toGeometry } from '../geo/polygons.ts'

/**
 * Compact storage format of the place dataset (src/data/places.json).
 *
 * Coordinates are integers in units of 10^-decimals degrees. Each ring is one flat array
 * [lng0, lat0, Δlng1, Δlat1, …]: the first point absolute, every further point as the
 * difference to the previous one. Rings stay closed (last point = first point).
 * About half the gzip size of plain GeoJSON.
 */
export interface PlaceFile {
  format: 'eingekreist-places'
  version: 1
  decimals: number
  places: EncodedPlace[]
}

export interface EncodedPlace {
  id: string
  name: string
  qualifier?: string
  category: Place['category']
  /** Polygons → rings → delta-encoded coordinates. */
  polygons: number[][][]
}

export function encodeRing(ring: Position[], decimals: number): number[] {
  const f = 10 ** decimals
  const out: number[] = []
  let x = 0
  let y = 0
  for (const [lng, lat] of ring) {
    const X = Math.round(lng * f)
    const Y = Math.round(lat * f)
    out.push(X - x, Y - y)
    x = X
    y = Y
  }
  return out
}

export function decodeRing(deltas: number[], decimals: number): Position[] {
  const f = 10 ** decimals
  const ring: Position[] = []
  let x = 0
  let y = 0
  for (let i = 0; i < deltas.length; i += 2) {
    x += deltas[i]
    y += deltas[i + 1]
    // Dividing integers keeps the values exact to `decimals` places (no 0.1 + 0.2 noise).
    ring.push([x / f, y / f])
  }
  return ring
}

export function encodePlaces(places: Place[], decimals: number): PlaceFile {
  return {
    format: 'eingekreist-places',
    version: 1,
    decimals,
    places: places.map(({ geometry, ...rest }) => ({
      ...rest,
      polygons: polygonsOf(geometry).map((p) => p.map((r) => encodeRing(r, decimals))),
    })),
  }
}

export function decodePlaces(file: PlaceFile): Place[] {
  if (file.format !== 'eingekreist-places' || file.version !== 1) {
    throw new Error(`Unknown place file format ${file.format} v${file.version}`)
  }
  return file.places.map(({ polygons, ...rest }) => ({
    ...rest,
    geometry: toGeometry(polygons.map((p) => p.map((r) => decodeRing(r, file.decimals)))),
  }))
}
