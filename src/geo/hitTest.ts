import { booleanPointInPolygon, lineString, point, pointToLineDistance } from '@turf/turf'
import type { MultiPolygon, Polygon, Position } from 'geojson'
import type { Circle, LngLat } from '../game/types'

/**
 * Kürzester geodätischer Abstand (km) vom Punkt zur Fläche.
 * 0, wenn der Punkt innerhalb liegt.
 */
export function distanceToAreaKm(
  center: LngLat,
  geometry: Polygon | MultiPolygon,
): number {
  const pt = point(center)
  if (booleanPointInPolygon(pt, geometry)) return 0

  const polygons: Position[][][] =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

  let min = Infinity
  for (const rings of polygons) {
    for (const ring of rings) {
      const d = pointToLineDistance(pt, lineString(ring), {
        units: 'kilometers',
        method: 'geodesic',
      })
      if (d < min) min = d
    }
  }
  return min
}

/** Ein Kreis trifft, sobald er die Fläche irgendwo berührt. */
export function circleHits(
  circle: Circle,
  geometry: Polygon | MultiPolygon,
): boolean {
  return distanceToAreaKm(circle.center, geometry) <= circle.radiusKm
}
