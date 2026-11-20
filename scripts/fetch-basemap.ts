/**
 * Downloads the base map (Natural Earth 1:50m, public domain) and writes it in the compact
 * delta-encoded format (src/data/basemapCodec.ts) to src/data/basemap/. Only needed when the
 * base map should change.
 *
 *   npm run fetch:basemap
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import type { FeatureCollection, Geometry, Position } from 'geojson'
import { encodeLines, encodePolygons } from '../src/data/basemapCodec.ts'
import { polygonsOf } from '../src/geo/polygons.ts'
// Same rounding as the place data: 3 decimals ≈ 110 m, finer than the 1:50m source itself.
import { COORD_DECIMALS, roundLine, roundPolys } from './places/geometry.ts'

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'
const OUT = 'src/data/basemap'

async function fetchGeometries(file: string): Promise<Geometry[]> {
  const res = await fetch(`${BASE}/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return ((await res.json()) as FeatureCollection).features.map((f) => f.geometry)
}

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

// Polygons that rounding shrank below a triangle (tiny islets) are dropped.
const land = roundPolys((await fetchGeometries('ne_50m_land.geojson')).flatMap(areaOf))
write('land', encodePolygons(land, COORD_DECIMALS), land.length)

const borders = (await fetchGeometries('ne_50m_admin_0_boundary_lines_land.geojson'))
  .flatMap(linesOf)
  .map(roundLine)
  .filter((l) => l.length >= 2)
write('borders', encodeLines(borders, COORD_DECIMALS), borders.length)
