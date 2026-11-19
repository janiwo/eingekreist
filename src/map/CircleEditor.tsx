import type { FeatureCollection, LineString, Polygon } from 'geojson'
import { useEffect, useRef } from 'react'
import type { Circle, LngLat } from '../game/types'
import { circleOutline, circlePolygon, initialRadiusKm, roundRadiusKm } from '../geo/circle'
import { bearingDeg, destination, distanceKm } from '../geo/sphere'
import { de } from '../i18n/de'
import { Marker, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from './maplibre'

const SOURCE = 'circle'
const FILL = 'circle-fill'
const LINE = 'circle-line'

/** Bearing of the radius handle when a circle is first placed: east. */
const DEFAULT_HANDLE_BEARING = 90

interface CircleEditorProps {
  map: MapLibreMap
  circle: Circle | null
  onChange: (circle: Circle) => void
  color?: string
}

function handleElement(kind: 'center' | 'radius', label: string, color: string): HTMLElement {
  const el = document.createElement('div')
  el.style.setProperty('--handle-color', color)
  el.className = `handle handle--${kind}`
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', label)
  el.dataset.testid = `handle-${kind}`
  return el
}

/** Current map scale at the screen center, in km per CSS pixel. */
function kmPerPixel(map: MapLibreMap): number {
  const { clientWidth: w, clientHeight: h } = map.getContainer()
  const a = map.unproject([w / 2, h / 2]).toArray() as LngLat
  const b = map.unproject([w / 2 + 10, h / 2]).toArray() as LngLat
  return distanceKm(a, b) / 10
}

const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Fill area and outline as separate features: the area's rings may run along a pole. */
function circleFeatures(circle: Circle): FeatureCollection<Polygon | LineString> {
  return {
    type: 'FeatureCollection',
    features: [circlePolygon(circle), circleOutline(circle)].map((geometry) => ({
      type: 'Feature',
      properties: {},
      geometry,
    })),
  }
}

/**
 * Lets the player place a circle by tapping the globe and adjust it with two handles:
 * one moves the center, the other changes the radius.
 */
export function CircleEditor({ map, circle, onChange, color = '#ff5a36' }: CircleEditorProps) {
  const circleRef = useRef(circle)
  const onChangeRef = useRef(onChange)
  const bearingRef = useRef(DEFAULT_HANDLE_BEARING)
  const draggingRadius = useRef(false)
  const markersRef = useRef<{ center: Marker; radius: Marker } | null>(null)

  useEffect(() => {
    circleRef.current = circle
    onChangeRef.current = onChange
  })

  // Layers, handles and the tap handler live as long as the editor.
  useEffect(() => {
    map.addSource(SOURCE, { type: 'geojson', data: empty })
    map.addLayer({
      id: FILL,
      type: 'fill',
      source: SOURCE,
      filter: ['==', ['geometry-type'], 'Polygon'],
      // No antialias outline: it would trace the pole and seam edges. The line layer draws the edge.
      paint: { 'fill-color': color, 'fill-opacity': 0.25, 'fill-antialias': false },
    })
    map.addLayer({
      id: LINE,
      type: 'line',
      source: SOURCE,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': color, 'line-width': 2.5 },
    })

    const center = new Marker({
      element: handleElement('center', de.circle.moveCenter, color),
      draggable: true,
    })
    const radius = new Marker({
      element: handleElement('radius', de.circle.changeRadius, color),
      draggable: true,
    })
    markersRef.current = { center, radius }

    center.on('drag', () => {
      const current = circleRef.current
      if (!current) return
      onChangeRef.current({ ...current, center: center.getLngLat().toArray() as LngLat })
    })
    radius.on('dragstart', () => (draggingRadius.current = true))
    radius.on('drag', () => {
      const current = circleRef.current
      if (!current) return
      const pos = radius.getLngLat().toArray() as LngLat
      bearingRef.current = bearingDeg(current.center, pos)
      onChangeRef.current({ ...current, radiusKm: roundRadiusKm(distanceKm(current.center, pos)) })
    })
    radius.on('dragend', () => {
      draggingRadius.current = false
      // Snap the handle back onto the (rounded) circle.
      const current = circleRef.current
      if (current) radius.setLngLat(destination(current.center, current.radiusKm, bearingRef.current))
    })

    const onClick = (e: MapMouseEvent) => {
      // Taps on a handle bubble up to the map; they must not move the circle.
      if ((e.originalEvent.target as Element).closest('.maplibregl-marker')) return
      const tapped = e.lngLat.toArray() as LngLat
      const current = circleRef.current
      if (current) {
        onChangeRef.current({ ...current, center: tapped })
      } else {
        const { clientWidth: w, clientHeight: h } = map.getContainer()
        bearingRef.current = DEFAULT_HANDLE_BEARING
        onChangeRef.current({
          center: tapped,
          radiusKm: initialRadiusKm(kmPerPixel(map), Math.min(w, h)),
        })
      }
    }
    map.on('click', onClick)

    return () => {
      map.off('click', onClick)
      center.remove()
      radius.remove()
      markersRef.current = null
      // The map may already be gone if the globe unmounted first.
      if (map.getStyle()) {
        map.removeLayer(LINE)
        map.removeLayer(FILL)
        map.removeSource(SOURCE)
      }
    }
  }, [map, color])

  // Sync geometry and handles with the circle.
  useEffect(() => {
    const markers = markersRef.current
    const source = map.getSource<GeoJSONSource>(SOURCE)
    if (!markers || !source) return
    if (!circle) {
      source.setData(empty)
      markers.center.remove()
      markers.radius.remove()
      return
    }
    source.setData(circleFeatures(circle))
    // addTo() re-attaches the marker and would cancel a running drag, so only call it once.
    const show = (marker: Marker, at: LngLat) => {
      marker.setLngLat(at)
      if (!marker.getElement().isConnected) marker.addTo(map)
    }
    show(markers.center, circle.center)
    if (!draggingRadius.current) {
      show(markers.radius, destination(circle.center, circle.radiusKm, bearingRef.current))
    }
  }, [map, circle])

  return null
}
