import type { LineString, Polygon, Position } from 'geojson'
import { MIN_RADIUS_KM, type Circle, type LngLat } from '../game/types'
import { EARTH_RADIUS_KM, HALF_CIRCUMFERENCE_KM, destination, normalizeLng } from './sphere'

/** Just under half the circumference; a larger circle would cover the whole Earth. */
export const MAX_RADIUS_KM = 20_000

/**
 * Clamps the radius to [MIN_RADIUS_KM, MAX_RADIUS_KM] and rounds it to about three
 * significant digits, so the stored radius is exactly what the player sees.
 */
export function roundRadiusKm(km: number): number {
  const clamped = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, km))
  if (clamped < 10) return Math.round(clamped * 10) / 10
  const step = clamped < 1000 ? 1 : clamped < 10_000 ? 10 : 100
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(clamped / step) * step))
}

/**
 * Starting radius for a new circle: a tenth of the shorter viewport side,
 * given the current map scale in km per pixel.
 */
export function initialRadiusKm(kmPerPixel: number, viewportPx: number): number {
  return roundRadiusKm(kmPerPixel * viewportPx * 0.1)
}

/** Distance (km) from a latitude to the north (+1) or south (-1) pole. */
const poleDistanceKm = (lat: number, pole: 1 | -1) =>
  (((90 - pole * lat) * Math.PI) / 180) * EARTH_RADIUS_KM

/** Ring of points on the circle, with longitudes unwrapped so neighbours differ by < 180°. */
function unwrappedRing(center: LngLat, radiusKm: number, steps: number): Position[] {
  const ring: Position[] = []
  for (let i = 0; i < steps; i++) {
    const p = destination(center, radiusKm, (i * 360) / steps)
    if (i > 0) {
      const prev = ring[i - 1][0]
      while (p[0] - prev > 180) p[0] -= 360
      while (p[0] - prev < -180) p[0] += 360
    }
    ring.push(p)
  }
  return ring
}

/**
 * The geodesic circle as a GeoJSON polygon (exterior ring counter-clockwise).
 *
 * Longitudes are continuous rather than wrapped to ±180°, so a circle across the
 * antimeridian stays one ring (MapLibre wraps coordinates beyond ±180° itself).
 * A circle around a pole is closed along that pole. A circle around both poles is
 * expressed as the whole world minus the circle around the antipode.
 */
export function circlePolygon({ center, radiusKm }: Circle, steps = 128): Polygon {
  const north = poleDistanceKm(center[1], 1) < radiusKm
  const south = poleDistanceKm(center[1], -1) < radiusKm

  if (north && south) {
    const antipode: LngLat = [normalizeLng(center[0] + 180), -center[1]]
    const hole = unwrappedRing(antipode, HALF_CIRCUMFERENCE_KM - radiusKm, steps)
    hole.push(hole[0])
    const mid = hole.reduce((sum, p) => sum + p[0], 0) / hole.length
    const outer: Position[] = [
      [mid - 180, -90],
      [mid + 180, -90],
      [mid + 180, 90],
      [mid - 180, 90],
      [mid - 180, -90],
    ]
    // Hole clockwise: the ring runs by increasing bearing, which is clockwise already.
    return { type: 'Polygon', coordinates: [outer, hole] }
  }

  const ring = closedOutline(center, radiusKm, steps)
  if (north || south) {
    // Around a pole the outline ends one full turn (±360°) from where it started.
    // Return along the pole to close the area.
    const poleLat = north ? 90 : -90
    ring.push([ring[ring.length - 1][0], poleLat], [ring[0][0], poleLat], ring[0])
  }
  // Increasing bearing runs clockwise; GeoJSON wants counter-clockwise exteriors.
  ring.reverse()
  return { type: 'Polygon', coordinates: [ring] }
}

/**
 * The circle's ring repeated back to its first vertex. Around a pole, that last vertex
 * sits one full turn (±360°) away from the first, so the ring stays continuous.
 */
function closedOutline(center: LngLat, radiusKm: number, steps: number): Position[] {
  const ring = unwrappedRing(center, radiusKm, steps)
  const [firstLng, firstLat] = ring[0]
  const lastLng = ring[ring.length - 1][0]
  ring.push([firstLng + 360 * Math.round((lastLng - firstLng) / 360), firstLat])
  return ring
}

/**
 * Just the circle's outline, for drawing. Unlike the polygon's rings it never runs
 * along a pole or the edge of the world.
 */
export function circleOutline({ center, radiusKm }: Circle, steps = 128): LineString {
  return { type: 'LineString', coordinates: closedOutline(center, radiusKm, steps) }
}
