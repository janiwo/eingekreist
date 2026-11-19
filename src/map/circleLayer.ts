import type { FeatureCollection, LineString, Polygon } from 'geojson'
import type { Circle } from '../game/types'
import { circleOutline, circlePolygon } from '../geo/circle'
import type { Map as MapLibreMap } from './maplibre'
import { addShapeLayer } from './shapeLayer'

export interface ColoredCircle {
  circle: Circle
  color: string
}

/**
 * Fill area and outline as separate features: the area's rings may run along a pole
 * or the edge of the world, so only the outline is stroked.
 */
export function circleFeatures(
  circles: ColoredCircle[],
): FeatureCollection<Polygon | LineString, { color: string }> {
  return {
    type: 'FeatureCollection',
    features: circles.flatMap(({ circle, color }) =>
      [circlePolygon(circle), circleOutline(circle)].map((geometry) => ({
        type: 'Feature' as const,
        properties: { color },
        geometry,
      })),
    ),
  }
}

/** A shape layer that draws any number of circles, each in its own color. */
export function addCircleLayer(map: MapLibreMap, id: string) {
  const layer = addShapeLayer(map, id)
  return {
    setCircles: (circles: ColoredCircle[]) => layer.setFeatures(circleFeatures(circles)),
    remove: layer.remove,
  }
}
