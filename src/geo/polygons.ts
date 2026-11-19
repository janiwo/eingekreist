import type { MultiPolygon, Polygon, Position } from 'geojson'

// The place build scripts run this module in plain Node: import only with explicit .ts extensions.

/** Polygons → rings → positions, as in a GeoJSON MultiPolygon. */
export type Polys = Position[][][]

/** Any area as a list of polygons. */
export function polygonsOf(g: Polygon | MultiPolygon): Polys {
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates
}

/** The smallest GeoJSON geometry for a list of polygons. */
export function toGeometry(polys: Polys): Polygon | MultiPolygon {
  return polys.length === 1
    ? { type: 'Polygon', coordinates: polys[0] }
    : { type: 'MultiPolygon', coordinates: polys }
}

export function vertexCount(g: Polygon | MultiPolygon): number {
  let n = 0
  for (const rings of polygonsOf(g)) for (const ring of rings) n += ring.length
  return n
}
