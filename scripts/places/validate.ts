/**
 * Checks the generated place dataset: valid geometries, no empty places, counts per category,
 * unique IDs and names, plausible city sizes, file size.
 *
 *   npm run validate:places
 */
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { area } from '@turf/area'
import { bbox } from '@turf/bbox'
import type { Position } from 'geojson'
import { decodePlaces, type PlaceFile } from '../../src/data/placeCodec.ts'
import { CATEGORIES, type Category, type Place } from '../../src/game/types.ts'
import { distanceKm } from '../../src/geo/sphere.ts'
import { crossings, polygonsOf } from './geometry.ts'
import { PLACES_FILE } from './output.ts'

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

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

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

export function validatePlaces(places: Place[], json: string): Report {
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
  const report = validatePlaces(decodePlaces(JSON.parse(json) as PlaceFile), json)
  console.log(formatReport(report))
  if (report.errors.length > 0) process.exit(1)
}
