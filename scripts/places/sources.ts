/**
 * Downloads and caches the raw source data (gitignored in .cache/places/).
 * Natural Earth comes from GitHub; OSM boundaries from Nominatim, respecting its usage
 * policy: at most one request per second, a generic User-Agent, every response cached.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'

export const CACHE_DIR = '.cache/places'
const NE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'
const NOMINATIM = 'https://nominatim.openstreetmap.org/lookup'
const USER_AGENT = 'eingekreist-place-builder/1.0'
const NOMINATIM_BATCH = 20

export type NeLayer =
  | 'admin_0_countries'
  | 'admin_0_boundary_lines_land'
  | 'land'
  | 'minor_islands'
  | 'geography_regions_polys'
  | 'geography_marine_polys'
  | 'lakes'
  | 'rivers_lake_centerlines'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function download(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.text()
}

/** A Natural Earth 1:10m layer as GeoJSON, from the cache or downloaded once. */
export async function naturalEarth(layer: NeLayer): Promise<FeatureCollection> {
  const file = `${CACHE_DIR}/ne_10m_${layer}.geojson`
  let text: string
  if (existsSync(file)) {
    text = readFileSync(file, 'utf8')
  } else {
    mkdirSync(CACHE_DIR, { recursive: true })
    console.log(`↓ ${file}`)
    text = await download(`${NE_BASE}/ne_10m_${layer}.geojson`)
    writeFileSync(file, text)
  }
  return JSON.parse(text) as FeatureCollection
}

const osmFile = (id: number) => `${CACHE_DIR}/osm/R${id}.geojson`

/** OSM relation boundaries by ID. Missing ones are fetched from Nominatim in batches. */
export async function osmBoundaries(ids: number[]): Promise<Map<number, Polygon | MultiPolygon>> {
  mkdirSync(`${CACHE_DIR}/osm`, { recursive: true })
  const missing = ids.filter((id) => !existsSync(osmFile(id)))
  for (let i = 0; i < missing.length; i += NOMINATIM_BATCH) {
    if (i > 0) await sleep(1100)
    const batch = missing.slice(i, i + NOMINATIM_BATCH)
    const params = new URLSearchParams({
      osm_ids: batch.map((id) => `R${id}`).join(','),
      format: 'geojson',
      polygon_geojson: '1',
      // Server-side simplification (degrees); far below our own tolerance, but saves bandwidth.
      polygon_threshold: '0.0005',
    })
    console.log(`↓ Nominatim: ${batch.length} relations`)
    const fc = JSON.parse(await download(`${NOMINATIM}?${params}`)) as FeatureCollection
    for (const f of fc.features) {
      const id = Number(f.properties?.osm_id)
      writeFileSync(osmFile(id), JSON.stringify(f))
    }
    for (const id of batch) {
      if (!existsSync(osmFile(id))) throw new Error(`OSM relation ${id} not returned by Nominatim`)
    }
  }
  const out = new Map<number, Polygon | MultiPolygon>()
  for (const id of ids) {
    const f = JSON.parse(readFileSync(osmFile(id), 'utf8')) as Feature<Geometry>
    if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') {
      throw new Error(`OSM relation ${id}: expected an area, got ${f.geometry.type}`)
    }
    out.set(id, f.geometry)
  }
  return out
}
