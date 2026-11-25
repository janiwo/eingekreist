import type { Circle, Place } from '../game/types'
import { placeBounds } from '../geo/placeView'
import type { Map as MapLibreMap } from './maplibre'
import { circleCamera, type Padding } from './view'

/** How far the camera zooms in on small places (cities, landmarks). */
const PLACE_MAX_ZOOM = 7

/**
 * The reveal's view of the place: its outline in the free area, zoomed in at most to
 * PLACE_MAX_ZOOM. Like every camera move, it interrupts a running flight.
 */
export function flyToPlace(map: MapLibreMap, place: Place, padding: Padding, duration: number) {
  // fitBounds, unlike flyTo with `padding`, does not keep the padding on the map afterwards.
  map.fitBounds(placeBounds(place.geometry), { padding, maxZoom: PLACE_MAX_ZOOM, duration })
}

/** Flies to a player's circle, as large as fits into the free area (see `circleCamera`). */
export function flyToCircle(map: MapLibreMap, { center, radiusKm }: Circle, padding: Padding, duration: number) {
  const { clientWidth, clientHeight } = map.getContainer()
  map.flyTo({ ...circleCamera(center, radiusKm, padding, clientWidth, clientHeight), duration })
}
