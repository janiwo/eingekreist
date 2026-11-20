import type { Feature, FeatureCollection, MultiLineString, MultiPolygon, Position } from 'geojson'
// Explicit .ts extension: scripts/fetch-basemap.ts runs this module in plain Node.
import { decodeRing, encodeRing } from './placeCodec.ts'

/**
 * Compact storage format of the base map (src/data/basemap/*.json): the same delta-encoded
 * integer rings as the place dataset (see placeCodec.ts). An area is a list of polygons
 * (each a list of rings), a line layer a list of lines.
 */
export type BaseMapFile = {
  format: 'eingekreist-basemap'
  version: 1
  decimals: number
} & ({ polygons: number[][][] } | { lines: number[][] })

export function encodePolygons(polygons: Position[][][], decimals: number): BaseMapFile {
  return {
    format: 'eingekreist-basemap',
    version: 1,
    decimals,
    polygons: polygons.map((p) => p.map((r) => encodeRing(r, decimals))),
  }
}

export function encodeLines(lines: Position[][], decimals: number): BaseMapFile {
  return {
    format: 'eingekreist-basemap',
    version: 1,
    decimals,
    lines: lines.map((l) => encodeRing(l, decimals)),
  }
}

/** One feature with all polygons or all lines of the file. */
export function decodeBaseMap(file: BaseMapFile): FeatureCollection<MultiPolygon | MultiLineString> {
  if (file.format !== 'eingekreist-basemap' || file.version !== 1) {
    throw new Error(`Unknown base map format ${file.format} v${file.version}`)
  }
  const { decimals } = file
  const feature: Feature<MultiPolygon | MultiLineString> = {
    type: 'Feature',
    properties: {},
    geometry:
      'polygons' in file
        ? { type: 'MultiPolygon', coordinates: file.polygons.map((p) => p.map((r) => decodeRing(r, decimals))) }
        : { type: 'MultiLineString', coordinates: file.lines.map((l) => decodeRing(l, decimals)) },
  }
  return { type: 'FeatureCollection', features: [feature] }
}
