import { useEffect, useRef } from 'react'
import type { Place } from '../game/types'
import { placeBounds, placeOutline } from '../geo/placeView'
import { circleFeatures, type ColoredCircle } from './circleLayer'
import type { Map as MapLibreMap, PaddingOptions } from './maplibre'
import { addShapeLayer } from './shapeLayer'

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
  onArrived?: () => void
}

/** Shows the place's outline and every player's circle, and flies the globe to the place. */
export function RevealLayers({ map, place, circles, padding, onArrived }: RevealLayersProps) {
  const paddingRef = useRef(padding)
  const onArrivedRef = useRef(onArrived)
  useEffect(() => {
    paddingRef.current = padding
    onArrivedRef.current = onArrived
  })

  useEffect(() => {
    const placeLayer = addShapeLayer(map, PLACE_LAYER_ID, { fillOpacity: 0.3, lineWidth: 2 })
    const circleLayer = addShapeLayer(map, CIRCLES_LAYER_ID)
    placeLayer.setFeatures({
      type: 'FeatureCollection',
      features: [place.geometry, placeOutline(place.geometry)].map((geometry) => ({
        type: 'Feature',
        properties: { color: PLACE_COLOR },
        geometry,
      })),
    })
    circleLayer.setFeatures(circleFeatures(circles))

    map.stop()
    map.fitBounds(placeBounds(place.geometry), { padding: paddingRef.current(), maxZoom: MAX_ZOOM, duration: FLIGHT_MS })
    // `idle` waits for the end of the flight.
    const arrived = () => onArrivedRef.current?.()
    map.once('idle', arrived)
    return () => {
      map.off('idle', arrived)
      map.stop()
      circleLayer.remove()
      placeLayer.remove()
    }
  }, [map, place, circles])

  return null
}
