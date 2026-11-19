/**
 * Lädt die Basiskarte (Natural Earth 1:50m, gemeinfrei) und schreibt kompakte GeoJSON-Dateien
 * nach src/data/basemap/. Nur nötig, wenn sich die Basiskarte ändern soll.
 *
 *   npm run fetch:basemap
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import type { FeatureCollection, Geometry, Position } from 'geojson'

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'
const OUT = 'src/data/basemap'

const FILES = {
  land: 'ne_50m_land.geojson',
  borders: 'ne_50m_admin_0_boundary_lines_land.geojson',
}

/** 4 Nachkommastellen ≈ 11 m, mehr als genug für die Basiskarte. */
const round = (p: Position): Position => p.map((n) => Math.round(n * 1e4) / 1e4)

function roundGeometry(g: Geometry): Geometry {
  switch (g.type) {
    case 'Polygon':
      return { type: g.type, coordinates: g.coordinates.map((r) => r.map(round)) }
    case 'MultiPolygon':
      return { type: g.type, coordinates: g.coordinates.map((p) => p.map((r) => r.map(round))) }
    case 'LineString':
      return { type: g.type, coordinates: g.coordinates.map(round) }
    case 'MultiLineString':
      return { type: g.type, coordinates: g.coordinates.map((l) => l.map(round)) }
    default:
      throw new Error(`Unerwarteter Geometrietyp: ${g.type}`)
  }
}

mkdirSync(OUT, { recursive: true })
for (const [name, file] of Object.entries(FILES)) {
  const res = await fetch(`${BASE}/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  const fc = (await res.json()) as FeatureCollection
  const slim: FeatureCollection = {
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      type: 'Feature',
      properties: {},
      geometry: roundGeometry(f.geometry),
    })),
  }
  const out = `${OUT}/${name}.json`
  writeFileSync(out, JSON.stringify(slim))
  console.log(`✓ ${out} (${slim.features.length} Features)`)
}
