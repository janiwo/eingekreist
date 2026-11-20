import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'
import { placeOutline } from '../geo/placeView'
import type { GeoJSONSource, Map as MapLibreMap } from './maplibre'

/** Features whose `color` property sets their fill or line color. */
export type ColoredFeatures = FeatureCollection<Geometry, { color: string }>

export const noFeatures: ColoredFeatures = { type: 'FeatureCollection', features: [] }

/** A place's area plus its outline (without the antimeridian cuts), in one color. */
export function placeFeatures(geometry: Polygon | MultiPolygon, color: string): ColoredFeatures {
  return {
    type: 'FeatureCollection',
    features: [geometry, placeOutline(geometry)].map((g) => ({ type: 'Feature', properties: { color }, geometry: g })),
  }
}

/**
 * Adds a source plus fill and line layers: polygons are filled, lines are stroked, each in
 * its feature's color. Areas should come with a separate outline line, because their rings
 * may run along a pole or the antimeridian. `id` must be unique per map.
 */
export function addShapeLayer(
  map: MapLibreMap,
  id: string,
  { fillOpacity = 0.25, lineWidth = 2.5 }: { fillOpacity?: number; lineWidth?: number } = {},
) {
  const fill = `${id}-fill`
  const line = `${id}-line`
  map.addSource(id, { type: 'geojson', data: noFeatures })
  map.addLayer({
    id: fill,
    type: 'fill',
    source: id,
    filter: ['==', ['geometry-type'], 'Polygon'],
    // No antialias outline: it would trace the pole and seam edges. The line layer draws the edge.
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': fillOpacity, 'fill-antialias': false },
  })
  map.addLayer({
    id: line,
    type: 'line',
    source: id,
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': ['get', 'color'], 'line-width': lineWidth },
  })

  return {
    setFeatures(features: ColoredFeatures) {
      map.getSource<GeoJSONSource>(id)?.setData(features)
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
