import { useEffect } from 'react'
import type { Place } from '../game/types'
import { placeBounds } from '../geo/placeView'
import { addCircleLayer, type ColoredCircle } from './circleLayer'
import type { Map as MapLibreMap, PaddingOptions } from './maplibre'
import { addShapeLayer, placeFeatures } from './shapeLayer'

export const PLACE_LAYER_ID = 'reveal-place'
export const CIRCLES_LAYER_ID = 'reveal-circles'
/** The place's outline: white stands out on land and sea and is no player color. */
const PLACE_COLOR = '#ffffff'
/** How far the camera zooms in on small places (cities, landmarks). */
const MAX_ZOOM = 7
const FLIGHT_MS = 2000

interface RevealLayersProps {
  map: MapLibreMap
  place: Place
  circles: ColoredCircle[]
  /** Screen space the camera should keep free (header, result card); read when the flight starts. */
  padding: () => PaddingOptions
  /** Called once the camera has arrived and the map has rendered. */
  onArrived: () => void
}

/**
 * Shows the place's outline and every player's circle, and flies the globe to the place.
 * All props must stay stable while the round is revealed; a change starts the flight anew.
 */
export function RevealLayers({ map, place, circles, padding, onArrived }: RevealLayersProps) {
  useEffect(() => {
    const placeLayer = addShapeLayer(map, PLACE_LAYER_ID, { fillOpacity: 0.3, lineWidth: 2 })
    const circleLayer = addCircleLayer(map, CIRCLES_LAYER_ID)
    placeLayer.setFeatures(placeFeatures(place.geometry, PLACE_COLOR))
    circleLayer.setCircles(circles)

    map.stop()
    map.fitBounds(placeBounds(place.geometry), { padding: padding(), maxZoom: MAX_ZOOM, duration: FLIGHT_MS })
    // `idle` waits for the end of the flight.
    map.once('idle', onArrived)
    return () => {
      map.off('idle', onArrived)
      map.stop()
      circleLayer.remove()
      placeLayer.remove()
    }
  }, [map, place, circles, padding, onArrived])

  return null
}
