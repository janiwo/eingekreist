import type { FeatureCollection, LineString, Polygon } from 'geojson'
import type { Circle } from '../game/types'
import { circleOutline, circlePolygon } from '../geo/circle'
import type { GeoJSONSource, Map as MapLibreMap } from './maplibre'

export interface ColoredCircle {
  circle: Circle
  color: string
}

/**
 * Fill area and outline as separate features: the area's rings may run along a pole
 * or the edge of the world, so only the outline is stroked.
 */
export function circleFeatures(circles: ColoredCircle[]): FeatureCollection<Polygon | LineString> {
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

/**
 * Adds a source plus fill and outline layers that draw any number of circles, each in
 * its own color. `id` must be unique per map. Returns an updater and a remover.
 */
export function addCircleLayer(map: MapLibreMap, id: string) {
  const fill = `${id}-fill`
  const line = `${id}-line`
  map.addSource(id, { type: 'geojson', data: circleFeatures([]) })
  map.addLayer({
    id: fill,
    type: 'fill',
    source: id,
    filter: ['==', ['geometry-type'], 'Polygon'],
    // No antialias outline: it would trace the pole and seam edges. The line layer draws the edge.
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.25, 'fill-antialias': false },
  })
  map.addLayer({
    id: line,
    type: 'line',
    source: id,
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': ['get', 'color'], 'line-width': 2.5 },
  })

  return {
    setCircles(circles: ColoredCircle[]) {
      map.getSource<GeoJSONSource>(id)?.setData(circleFeatures(circles))
    },
    remove() {
      // The map may already be gone if the globe unmounted first.
      if (!map.style) return
      map.removeLayer(line)
      map.removeLayer(fill)
      map.removeSource(id)
    },
  }
}
