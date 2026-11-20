import type { FeatureCollection, MultiLineString, MultiPolygon, Position } from 'geojson'
// Explicit .ts extension: scripts/fetch-basemap.ts runs this module in plain Node.
import { decodeRing, encodeRing } from './placeCodec.ts'

/**
 * Compact storage format of the base map (src/data/basemap/*.json): the same delta-encoded
 * integer rings as the place dataset (see placeCodec.ts). An area is a list of polygons
 * (each a list of rings), a line layer a list of lines.
 */
interface Header {
  format: 'eingekreist-basemap'
  version: 1
  decimals: number
}
export interface PolygonFile extends Header {
  polygons: number[][][]
}
export interface LineFile extends Header {
  lines: number[][]
}

const header = (decimals: number): Header => ({ format: 'eingekreist-basemap', version: 1, decimals })

function check(file: Header) {
  if (file.format !== 'eingekreist-basemap' || file.version !== 1) {
    throw new Error(`Unknown base map format ${file.format} v${file.version}`)
  }
}

/** A collection with a single feature. */
const collection = <G extends MultiPolygon | MultiLineString>(geometry: G): FeatureCollection<G> => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: {}, geometry }],
})

export const encodePolygons = (polygons: Position[][][], decimals: number): PolygonFile => ({
  ...header(decimals),
  polygons: polygons.map((p) => p.map((r) => encodeRing(r, decimals))),
})

export const encodeLines = (lines: Position[][], decimals: number): LineFile => ({
  ...header(decimals),
  lines: lines.map((l) => encodeRing(l, decimals)),
})

/** All polygons as one MultiPolygon feature. */
export function decodePolygons(file: PolygonFile): FeatureCollection<MultiPolygon> {
  check(file)
  const coordinates = file.polygons.map((p) => p.map((r) => decodeRing(r, file.decimals)))
  return collection({ type: 'MultiPolygon', coordinates })
}

/** All lines as one MultiLineString feature. */
export function decodeLines(file: LineFile): FeatureCollection<MultiLineString> {
  check(file)
  return collection({ type: 'MultiLineString', coordinates: file.lines.map((l) => decodeRing(l, file.decimals)) })
}
