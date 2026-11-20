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

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'
const OUT = 'src/data/basemap'

/** 3 decimal places ≈ 110 m, finer than the 1:50m source data itself. */
const DECIMALS = 3
const f = 10 ** DECIMALS
const round = (p: Position): Position => p.map((n) => Math.round(n * f) / f)

/** Rounds and drops points that rounding made repeat. */
function roundLine(line: Position[]): Position[] {
  const out: Position[] = []
  for (const p of line.map(round)) {
    const last = out.at(-1)
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
  }
  return out
}

async function fetchGeometries(file: string): Promise<Geometry[]> {
  const res = await fetch(`${BASE}/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return ((await res.json()) as FeatureCollection).features.map((f) => f.geometry)
}

function polygonsOf(g: Geometry): Position[][][] {
  if (g.type === 'Polygon') return [g.coordinates]
  if (g.type === 'MultiPolygon') return g.coordinates
  throw new Error(`Unexpected geometry type: ${g.type}`)
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

// Rings that rounding shrank below a triangle (tiny islets) are dropped.
const land = (await fetchGeometries('ne_50m_land.geojson'))
  .flatMap(polygonsOf)
  .map((rings) => rings.map(roundLine))
  // The outer ring decides about the polygon; a dropped hole just fills in.
  .filter((rings) => rings[0].length >= 4)
  .map((rings) => rings.filter((r) => r.length >= 4))
write('land', encodePolygons(land, DECIMALS), land.length)

const borders = (await fetchGeometries('ne_50m_admin_0_boundary_lines_land.geojson'))
  .flatMap(linesOf)
  .map(roundLine)
  .filter((l) => l.length >= 2)
write('borders', encodeLines(borders, DECIMALS), borders.length)
