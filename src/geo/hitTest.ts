import { booleanPointInPolygon, lineString, point, pointToLineDistance } from '@turf/turf'
import type { MultiPolygon, Polygon, Position } from 'geojson'
import type { Circle, LngLat } from '../game/types'

/**
 * Shortest geodesic distance (km) from the point to the area.
 * 0 if the point lies inside.
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

/** A circle hits as soon as it touches the area anywhere. */
export function circleHits(
  circle: Circle,
  geometry: Polygon | MultiPolygon,
): boolean {
  return distanceToAreaKm(circle.center, geometry) <= circle.radiusKm
}
