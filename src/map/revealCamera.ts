import type { Circle, Place } from '../game/types'
import { placeBounds } from '../geo/placeView'
import type { Map as MapLibreMap } from './maplibre'
import { circleCamera, type Padding } from './view'

/** How far the camera zooms in on small places (cities, landmarks). */
const PLACE_MAX_ZOOM = 7

/**
 * From this zoom on, MapLibre's globe renders as flat Mercator (it blends in from zoom 11).
 * Fitting and flying from there use Mercator's camera math, which misses the globe's view
 * of a place: a different zoom, and the centre tens of degrees east or west.
 */
export const GLOBE_MERCATOR_ZOOM = 12
/** Just below GLOBE_MERCATOR_ZOOM, where the globe still renders (barely) as a globe. */
const GLOBE_RENDERING_ZOOM = GLOBE_MERCATOR_ZOOM - 0.01

/**
 * The reveal's view of the place: its outline in the free area, zoomed in at most to
 * PLACE_MAX_ZOOM. Like every camera move, it interrupts a running flight. The view is the
 * same wherever the camera starts, zoomed in on a player's circle included.
 */
export function flyToPlace(map: MapLibreMap, place: Place, padding: Padding, duration: number) {
  if (map.getZoom() >= GLOBE_MERCATOR_ZOOM) {
    // Back to globe rendering first, so the fit and the flight use the globe's math. The
    // projection only switches when the map renders, hence the synchronous redraw.
    map.jumpTo({ zoom: GLOBE_RENDERING_ZOOM })
    map.redraw()
  }
  // fitBounds, unlike flyTo with `padding`, does not keep the padding on the map afterwards.
  map.fitBounds(placeBounds(place.geometry), { padding, maxZoom: PLACE_MAX_ZOOM, duration })
}

/** Flies to a player's circle, as large as fits into the free area (see `circleCamera`). */
export function flyToCircle(map: MapLibreMap, { center, radiusKm }: Circle, padding: Padding, duration: number) {
  const { clientWidth, clientHeight } = map.getContainer()
  map.flyTo({ ...circleCamera(center, radiusKm, padding, clientWidth, clientHeight), duration })
}
