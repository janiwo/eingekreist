import type { LineString, Polygon, Position } from 'geojson'
import { MIN_RADIUS_KM, type Circle, type LngLat } from '../game/types'
import { HALF_CIRCUMFERENCE_KM, destination, distanceKm, normalizeLng } from './sphere'

/** Just under half the circumference; a larger circle would cover the whole Earth. */
export const MAX_RADIUS_KM = 20_000

/**
 * Clamps the radius to [MIN_RADIUS_KM, MAX_RADIUS_KM] and rounds it to about three
 * significant digits, so the stored radius is exactly what the player sees.
 */
export function roundRadiusKm(km: number): number {
  const step = km < 1000 ? 1 : km < 10_000 ? 10 : 100
  // Below 10 km keep one decimal; multiplying avoids float noise like 3.1000000000000005.
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km / step) * step
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, rounded))
}

/**
 * The radius one keyboard step up (`direction` 1) or down (-1). Multiplicative, so a step is
 * about as noticeable at any size; 5 % is always more than the rounding step, so the
 * radius changes unless it is clamped.
 */
export function stepRadiusKm(km: number, direction: 1 | -1, large = false): number {
  // Arrow key: 5 %, with Shift: 25 %.
  const factor = large ? 1.25 : 1.05
  return roundRadiusKm(km * factor ** direction)
}

/**
 * Starting radius for a new circle: a tenth of the shorter viewport side,
 * given the current map scale in km per pixel.
 */
export function initialRadiusKm(kmPerPixel: number, viewportPx: number): number {
  return roundRadiusKm(kmPerPixel * viewportPx * 0.1)
}

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
  const north = distanceKm(center, [0, 90]) < radiusKm
  const south = distanceKm(center, [0, -90]) < radiusKm

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
