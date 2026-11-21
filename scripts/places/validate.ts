/**
 * Checks the generated place dataset: valid geometries, no empty places, counts per category,
 * unique IDs and names, plausible city sizes, file size, and that every place is visible on the
 * globe (spec §4.5).
 *
 *   npm run validate:places
 */
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { area } from '@turf/area'
import { bbox } from '@turf/bbox'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import type { Position } from 'geojson'
import { decodePolygons, type PolygonFile } from '../../src/data/basemapCodec.ts'
import { decodePlaces, type PlaceFile } from '../../src/data/placeCodec.ts'
import { CATEGORIES, type Category, type Place } from '../../src/game/types.ts'
import { distanceKm } from '../../src/geo/sphere.ts'
import { crossings, polygonsOf, type Polys } from './geometry.ts'
import { placeSources } from './list/index.ts'
import { PLACES_FILE } from './output.ts'
import type { BBox } from './types.ts'

/** Allowed number of places per category (spec §4.1, "approx."). */
export const COUNT_RANGES: Record<Category, [number, number]> = {
  country: [190, 200],
  city: [130, 170],
  island: [40, 70],
  landscape: [40, 75],
  water: [50, 75],
  landmark: [65, 110],
}

export const MAX_FILE_BYTES = 3_000_000
export const MAX_GZIP_BYTES = 1_000_000

/** City boundaries larger than this are outliers (spec §4.3, e.g. Chongqing). */
export const MAX_CITY_AREA_KM2 = 20_000
export const MAX_CITY_EXTENT_KM = 300

export interface Report {
  errors: string[]
  counts: Record<Category, number>
  fileBytes: number
  gzipBytes: number
  vertices: number
  largest: { id: string; vertices: number }[]
}

/** A sea or strait whose largest part holds less of its area is a set of slivers. */
export const MIN_MARINE_MAIN_PART = 0.5

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** What the globe shows, to check that every place is visible on it. */
export interface Globe {
  land: { poly: Position[][]; bbox: BBox }[]
  /** IDs of places built from Natural Earth marine polygons. */
  marine: Set<string>
}

export function makeGlobe(land: Polys, marine: Iterable<string>): Globe {
  return {
    land: land.map((poly) => ({ poly, bbox: bbox({ type: 'Polygon', coordinates: poly }) as BBox })),
    marine: new Set(marine),
  }
}

/** The globe's land (src/data/basemap/) and the marine places of the curated list. */
export function loadGlobe(): Globe {
  const file = JSON.parse(readFileSync('src/data/basemap/land.json', 'utf8')) as PolygonFile
  const land = decodePolygons(file).features[0].geometry.coordinates
  return makeGlobe(land, placeSources.filter((s) => s.source.kind === 'marine').map((s) => s.id))
}

const overlaps = (a: BBox, b: BBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
const inBox = ([lng, lat]: Position, b: BBox) => lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3]

/**
 * Whether the area overlaps the globe's land: one of its vertices lies on land, or a land vertex
 * lies inside it. Misses only edges that cross without any vertex inside, which needs both
 * outlines to be far coarser than ours.
 */
function touchesLand(polys: Polys, globe: Globe): boolean {
  for (const poly of polys) {
    const box = bbox({ type: 'Polygon', coordinates: poly }) as BBox
    const geometry = { type: 'Polygon' as const, coordinates: poly }
    for (const { poly: land, bbox: landBox } of globe.land) {
      if (!overlaps(box, landBox)) continue
      const landGeometry = { type: 'Polygon' as const, coordinates: land }
      if (poly[0].some((v) => inBox(v, landBox) && booleanPointInPolygon(v, landGeometry))) return true
      if (land[0].some((v) => inBox(v, box) && booleanPointInPolygon(v, geometry))) return true
    }
  }
  return false
}

/** Share of the area held by the largest part. */
function mainPartShare(polys: Polys): number {
  const areas = polys.map((p) => area({ type: 'Polygon', coordinates: p }))
  const total = areas.reduce((a, b) => a + b, 0)
  return total > 0 ? Math.max(...areas) / total : 0
}

function ringErrors(ring: Position[]): string | undefined {
  if (ring.length < 4) return `ring with ${ring.length} points`
  const [a, b] = [ring[0], ring[ring.length - 1]]
  if (a[0] !== b[0] || a[1] !== b[1]) return 'ring not closed'
  for (const [i, [lng, lat]] of ring.entries()) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      return `coordinate out of range: ${lng},${lat}`
    }
    // An edge this long wraps around the antimeridian instead of being cut there.
    if (i > 0 && Math.abs(lng - ring[i - 1][0]) > 180) return `edge across the antimeridian at ${lng},${lat}`
  }
}

/** Without `globe`, the checks against the globe (spec §4.5) are skipped. */
export function validatePlaces(places: Place[], json: string, globe?: Globe): Report {
  const errors: string[] = []
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>
  const ids = new Set<string>()
  const names = new Set<string>()
  const sizes: { id: string; vertices: number }[] = []

  for (const p of places) {
    const err = (msg: string) => errors.push(`${p.id}: ${msg}`)
    if (!ID_PATTERN.test(p.id)) err('ID is not kebab-case')
    if (ids.has(p.id)) err('duplicate ID')
    ids.add(p.id)
    if (!CATEGORIES.includes(p.category)) err(`unknown category ${p.category}`)
    else counts[p.category]++
    if (!p.name.trim()) err('empty name')
    const key = `${p.category}|${p.name}|${p.qualifier ?? ''}`
    if (names.has(key)) err(`name "${p.name}" is ambiguous in its category; add a qualifier`)
    names.add(key)

    const polys = polygonsOf(p.geometry)
    if (polys.length === 0) err('empty geometry')
    let vertices = 0
    for (const rings of polys) {
      if (rings.length === 0) err('polygon without rings')
      for (const ring of rings) {
        vertices += ring.length
        const e = ringErrors(ring)
        if (e) err(e)
      }
    }
    sizes.push({ id: p.id, vertices })
    const crossed = crossings(polys)
    if (crossed > 0) err(`${crossed} self-intersections`)

    // Visible on the globe (spec §4.5): faulty entries are left out of the list, not patched.
    if (globe && p.category !== 'water' && !touchesLand(polys, globe)) err('does not touch the land drawn on the globe')
    if (globe?.marine.has(p.id)) {
      const share = mainPartShare(polys)
      if (share < MIN_MARINE_MAIN_PART) err(`fragmented: largest part holds only ${Math.round(share * 100)}% of the area`)
    }

    const km2 = area(p.geometry) / 1e6
    if (!(km2 > 0)) err('zero area')
    if (p.category === 'city') {
      const [w, s, e, n] = bbox(p.geometry)
      const extent = distanceKm([w, s], [e, n])
      if (km2 > MAX_CITY_AREA_KM2) err(`city area ${Math.round(km2)} km² > ${MAX_CITY_AREA_KM2}`)
      if (extent > MAX_CITY_EXTENT_KM) err(`city extent ${Math.round(extent)} km > ${MAX_CITY_EXTENT_KM}`)
    }
  }

  for (const c of CATEGORIES) {
    const [min, max] = COUNT_RANGES[c]
    if (counts[c] < min || counts[c] > max) errors.push(`${c}: ${counts[c]} places, expected ${min}–${max}`)
  }

  const fileBytes = Buffer.byteLength(json)
  const gzipBytes = gzipSync(json).length
  if (fileBytes > MAX_FILE_BYTES) errors.push(`file size ${fileBytes} B > ${MAX_FILE_BYTES} B`)
  if (gzipBytes > MAX_GZIP_BYTES) errors.push(`gzip size ${gzipBytes} B > ${MAX_GZIP_BYTES} B`)

  sizes.sort((a, b) => b.vertices - a.vertices)
  const vertices = sizes.reduce((sum, s) => sum + s.vertices, 0)
  return { errors, counts, fileBytes, gzipBytes, vertices, largest: sizes.slice(0, 8) }
}

export function formatReport(r: Report): string {
  const kb = (b: number) => `${Math.round(b / 1024)} KB`
  const lines = [
    `Places: ${CATEGORIES.map((c) => `${c} ${r.counts[c]}`).join(', ')}`,
    `Size: ${kb(r.fileBytes)} (gzip ${kb(r.gzipBytes)}), ${r.vertices} vertices`,
    `Largest: ${r.largest.map((s) => `${s.id} ${s.vertices}`).join(', ')}`,
    r.errors.length === 0 ? '✓ valid' : `✗ ${r.errors.length} errors:\n  ${r.errors.join('\n  ')}`,
  ]
  return lines.join('\n')
}

if (import.meta.main) {
  const json = readFileSync(PLACES_FILE, 'utf8')
  const report = validatePlaces(decodePlaces(JSON.parse(json) as PlaceFile), json, loadGlobe())
  console.log(formatReport(report))
  if (report.errors.length > 0) process.exit(1)
}
