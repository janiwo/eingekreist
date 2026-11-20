/**
 * Geometry steps of the place build: collect polygon parts, drop excluded parts, buffer points
 * and lines, simplify, round and repair. Everything works on plain coordinate arrays.
 */
import { buffer } from '@turf/buffer'
import { lineString } from '@turf/helpers'
import { simplify } from '@turf/simplify'
import type { Position } from 'geojson'
import * as polyclip from 'polyclip-ts'
import type { LngLat } from '../../src/game/types.ts'
import { polygonsOf, type Polys } from '../../src/geo/polygons.ts'
import { destination, distanceKm } from '../../src/geo/sphere.ts'
import type { BBox } from './types.ts'

export { polygonsOf, toGeometry, type Polys } from '../../src/geo/polygons.ts'

/** ~500 m in degrees of latitude (spec §4.3). */
export const SIMPLIFY_TOLERANCE_DEG = 0.0045

/** 3 decimals ≈ 110 m, well below the simplification tolerance. */
export const COORD_DECIMALS = 3

/** Longest piece of a line that is buffered in one go; keeps turf's projection accurate. */
const LINE_CHUNK_KM = 150

export function inBBox([lng, lat]: Position, [w, s, e, n]: BBox): boolean {
  return lng >= w && lng <= e && lat >= s && lat <= n
}

/** Drops every polygon whose outer ring lies completely inside one of the boxes. */
export function excludeParts(polys: Polys, boxes: BBox[] = []): Polys {
  return polys.filter((p) => !boxes.some((b) => p[0].every((v) => inBBox(v, b))))
}

/**
 * Geodesic circle around a point, counter-clockwise. Not split at the antimeridian; no landmark
 * is close enough to it for that to matter, and validation rejects edges that wrap around.
 */
export function bufferPoint(at: LngLat, km: number, steps = 48): Polys {
  const ring: Position[] = []
  for (let i = 0; i < steps; i++) ring.push(destination(at, km, 360 - (i * 360) / steps))
  ring.push(ring[0])
  return [[ring]]
}

/** Splits a line into consecutive pieces of at most `maxKm`, sharing their end points. */
export function chunkLine(line: Position[], maxKm: number): Position[][] {
  const chunks: Position[][] = []
  let current: Position[] = [line[0]]
  let km = 0
  for (let i = 1; i < line.length; i++) {
    km += distanceKm(line[i - 1] as LngLat, line[i] as LngLat)
    current.push(line[i])
    if (km >= maxKm && i < line.length - 1) {
      chunks.push(current)
      current = [line[i]]
      km = 0
    }
  }
  if (current.length > 1) chunks.push(current)
  return chunks
}

/** Buffers lines by `km` on each side and merges the result into one area. */
export function bufferLines(lines: Position[][], km: number): Polys {
  const pieces: Polys = []
  for (const line of lines) {
    for (const chunk of chunkLine(line, LINE_CHUNK_KM)) {
      const buffered = buffer(lineString(chunk), km, { units: 'kilometers', steps: 6 })
      if (buffered) pieces.push(...polygonsOf(buffered.geometry))
    }
  }
  return union(pieces)
}

/**
 * Longitude scale for a set of points, so a tolerance in degrees means the same distance
 * east-west as north-south (at the points' mean latitude).
 */
function lngScale(points: Position[]): number {
  const meanLat = points.reduce((sum, p) => sum + p[1], 0) / points.length
  return Math.max(0.1, Math.cos((meanLat * Math.PI) / 180))
}

const scaleRing = (ring: Position[], k: number) => ring.map(([lng, lat]) => [lng * k, lat])

export function simplifyLines(lines: Position[][]): Position[][] {
  return lines.map((l) => {
    if (l.length <= 2) return l
    const k = lngScale(l)
    const simple = simplify(lineString(scaleRing(l, k)), { tolerance: SIMPLIFY_TOLERANCE_DEG })
    return scaleRing(simple.geometry.coordinates, 1 / k)
  })
}

/**
 * Douglas-Peucker per polygon, in degrees of latitude with longitudes scaled to match;
 * turf keeps every ring at four or more points.
 */
export function simplifyPolys(polys: Polys): Polys {
  return polys.map((p) => {
    const k = lngScale(p[0])
    const coordinates = p.map((r) => scaleRing(r, k))
    const simple = simplify({ type: 'Polygon', coordinates }, { tolerance: SIMPLIFY_TOLERANCE_DEG })
    return simple.coordinates.map((r) => scaleRing(r, 1 / k))
  })
}

const factor = 10 ** COORD_DECIMALS
const roundNum = (n: number) => Math.round(n * factor) / factor

/** Rounds coordinates to COORD_DECIMALS and removes points that rounding made repeat. */
export function roundLine(line: Position[]): Position[] {
  const r: Position[] = []
  for (const [lng, lat] of line) {
    const q = [roundNum(lng), roundNum(lat)]
    const prev = r[r.length - 1]
    if (!prev || prev[0] !== q[0] || prev[1] !== q[1]) r.push(q)
  }
  return r
}

/** Rounds coordinates, removes repeated points and drops rings that collapsed. */
export function roundPolys(polys: Polys): Polys {
  // A valid ring has at least three distinct points plus the closing one.
  const valid = (r: Position[]) => r.length >= 4
  return polys.flatMap(([outer, ...holes]) => {
    const o = roundLine(outer)
    // Outer ring collapsed: drop the whole polygon, holes included.
    return valid(o) ? [[o, ...holes.map(roundLine).filter(valid)]] : []
  })
}

/** Union of all parts. Also repairs self-intersections and merges overlapping parts. */
export function union(polys: Polys): Polys {
  if (polys.length === 0) return []
  const [first, ...rest] = polys as polyclip.Geom[]
  return polyclip.union(first, ...rest) as Polys
}

const isRounded = (polys: Polys) =>
  polys.every((p) => p.every((r) => r.every(([lng, lat]) => lng === roundNum(lng) && lat === roundNum(lat))))

/** The parts of `polys` that also lie in `mask`. */
export function intersect(polys: Polys, mask: Polys): Polys {
  if (polys.length === 0 || mask.length === 0) return []
  return polyclip.intersection(polys as polyclip.Geom, mask as polyclip.Geom) as Polys
}

/**
 * Final pass for every place: round, then repair. The repair adds intersection vertices,
 * and rounding those can create new crossings, so repeat until nothing changes.
 */
export function finalize(polys: Polys): Polys {
  let current = roundPolys(polys)
  for (let i = 0; i < 5; i++) {
    const repaired = union(current)
    if (isRounded(repaired)) return repaired
    current = roundPolys(repaired)
  }
  return current
}

/**
 * Number of invalid segment intersections in the geometry: proper crossings and collinear
 * overlaps. Rings and parts may touch at single points (valid in a MultiPolygon, and common
 * after the union step), so contact at a vertex doesn't count.
 *
 * Sweep over segments sorted by west end. Coordinates are scaled to integers, which keeps
 * the orientation tests exact.
 */
export function crossings(polys: Polys): number {
  type Seg = [number, number, number, number]
  const segs: Seg[] = []
  for (const rings of polys) {
    for (const ring of rings) {
      let ax = Math.round(ring[0][0] * factor)
      let ay = Math.round(ring[0][1] * factor)
      for (let i = 1; i < ring.length; i++) {
        const bx = Math.round(ring[i][0] * factor)
        const by = Math.round(ring[i][1] * factor)
        segs.push(ax <= bx ? [ax, ay, bx, by] : [bx, by, ax, ay])
        ax = bx
        ay = by
      }
    }
  }
  segs.sort((s, t) => s[0] - t[0])

  const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax))

  let count = 0
  const active: Seg[] = []
  for (const s of segs) {
    // Drop segments that end west of this one, compacting in place.
    let n = 0
    for (const t of active) if (t[2] >= s[0]) active[n++] = t
    active.length = n
    for (const t of active) {
      if (Math.max(s[1], s[3]) < Math.min(t[1], t[3]) || Math.max(t[1], t[3]) < Math.min(s[1], s[3])) continue
      const d1 = orient(s[0], s[1], s[2], s[3], t[0], t[1])
      const d2 = orient(s[0], s[1], s[2], s[3], t[2], t[3])
      const d3 = orient(t[0], t[1], t[2], t[3], s[0], s[1])
      const d4 = orient(t[0], t[1], t[2], t[3], s[2], s[3])
      if (d1 * d2 < 0 && d3 * d4 < 0) {
        count++ // proper crossing
      } else if (d1 === 0 && d2 === 0) {
        // Collinear: compare along x, or along y for vertical segments.
        const i = s[0] !== s[2] || t[0] !== t[2] ? 0 : 1
        const lo = Math.max(Math.min(s[i], s[i + 2]), Math.min(t[i], t[i + 2]))
        const hi = Math.min(Math.max(s[i], s[i + 2]), Math.max(t[i], t[i + 2]))
        if (hi > lo) count++ // overlap longer than a point
      }
    }
    active.push(s)
  }
  return count
}
