/**
 * Builds the base map from Natural Earth 1:10m (public domain) and writes it in the compact
 * delta-encoded format (src/data/basemapCodec.ts) to src/data/basemap/. Only needed when the
 * base map should change.
 *
 *   npm run fetch:basemap
 *
 * The globe must show the same coastlines the places are scored against. So it uses the same
 * layers as the place build (land and minor islands, from its download cache) and the same
 * simplification and rounding.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Geometry, Position } from 'geojson'
import { encodeLines, encodePolygons } from '../src/data/basemapCodec.ts'
import { polygonsOf } from '../src/geo/polygons.ts'
import { COORD_DECIMALS, finalize, roundLine, simplifyLines, simplifyPolys, union } from './places/geometry.ts'
import { naturalEarth, type NeLayer } from './places/sources.ts'

const OUT = 'src/data/basemap'

const geometries = async (layer: NeLayer): Promise<Geometry[]> =>
  (await naturalEarth(layer)).features.flatMap((f) => (f.geometry ? [f.geometry] : []))

function areaOf(g: Geometry) {
  if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') throw new Error(`Unexpected geometry type: ${g.type}`)
  return polygonsOf(g)
}

function linesOf(g: Geometry): Position[][] {
  if (g.type === 'LineString') return [g.coordinates]
  if (g.type === 'MultiLineString') return g.coordinates
  throw new Error(`Unexpected geometry type: ${g.type}`)
}

function write(name: string, data: unknown, count: number) {
  const out = `${OUT}/${name}.json`
  writeFileSync(out, JSON.stringify(data))
  console.log(`✓ ${out} (${count})`)
}

mkdirSync(OUT, { recursive: true })

// Each polygon goes through the same steps as a place (union, simplify, round and repair), so an
// island drawn on the globe has exactly the outline its place is scored against. Land and minor
// islands may overlap; the fill is opaque, so they aren't merged with each other.
// Polygons that rounding shrank below a triangle (tiny islets) are dropped.
const landParts = [...(await geometries('land')), ...(await geometries('minor_islands'))].flatMap(areaOf)
const land = landParts.flatMap((p) => finalize(simplifyPolys(union([p]))))
write('land', encodePolygons(land, COORD_DECIMALS), land.length)

const borders = simplifyLines((await geometries('admin_0_boundary_lines_land')).flatMap(linesOf))
  .map(roundLine)
  .filter((l) => l.length >= 2)
write('borders', encodeLines(borders, COORD_DECIMALS), borders.length)
