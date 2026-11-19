import { useEffect, useRef } from 'react'
import type { Circle, LngLat } from '../game/types'
import { initialRadiusKm, roundRadiusKm } from '../geo/circle'
import { bearingDeg, destination, distanceKm } from '../geo/sphere'
import { de } from '../i18n/de'
import { addCircleLayer } from './circleLayer'
import { Marker, type Map as MapLibreMap, type MapMouseEvent } from './maplibre'

const LAYER_ID = 'edit-circle'

/** Bearing of the radius handle when a circle is first placed: east. */
const DEFAULT_HANDLE_BEARING = 90

interface CircleEditorProps {
  map: MapLibreMap
  circle: Circle | null
  onChange: (circle: Circle) => void
  color?: string
}

function handleElement(kind: 'center' | 'radius', label: string): HTMLElement {
  const el = document.createElement('div')
  el.className = `handle handle--${kind}`
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', label)
  el.dataset.testid = `handle-${kind}`
  return el
}

/** Starting radius for a new circle, based on the map scale at the screen center. */
function initialRadiusFor(map: MapLibreMap): number {
  const { clientWidth: w, clientHeight: h } = map.getContainer()
  const a = map.unproject([w / 2, h / 2]).toArray() as LngLat
  const b = map.unproject([w / 2 + 10, h / 2]).toArray() as LngLat
  return initialRadiusKm(distanceKm(a, b) / 10, Math.min(w, h))
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
  const editorRef = useRef<{
    layer: ReturnType<typeof addCircleLayer>
    center: Marker
    radius: Marker
  } | null>(null)

  useEffect(() => {
    circleRef.current = circle
    onChangeRef.current = onChange
  })

  // Layers, handles and the tap handler live as long as the editor.
  useEffect(() => {
    const layer = addCircleLayer(map, LAYER_ID)

    const center = new Marker({
      element: handleElement('center', de.circle.moveCenter),
      draggable: true,
    })
    const radius = new Marker({
      element: handleElement('radius', de.circle.changeRadius),
      draggable: true,
    })
    editorRef.current = { layer, center, radius }

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
      const radiusKm = roundRadiusKm(distanceKm(current.center, pos))
      // Most pointer moves don't change the rounded radius; skip the re-render then.
      if (radiusKm !== current.radiusKm) onChangeRef.current({ ...current, radiusKm })
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
        bearingRef.current = DEFAULT_HANDLE_BEARING
        onChangeRef.current({ center: tapped, radiusKm: initialRadiusFor(map) })
      }
    }
    map.on('click', onClick)

    return () => {
      map.off('click', onClick)
      center.remove()
      radius.remove()
      editorRef.current = null
      layer.remove()
    }
  }, [map])

  // Sync geometry and handles with the circle.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (!circle) {
      editor.layer.setCircles([])
      editor.center.remove()
      editor.radius.remove()
      return
    }
    editor.layer.setCircles([{ circle, color }])
    // addTo() re-attaches the marker and would cancel a running drag, so only call it once.
    const show = (marker: Marker, at: LngLat) => {
      marker.getElement().style.setProperty('--handle-color', color)
      marker.setLngLat(at)
      if (!marker.getElement().isConnected) marker.addTo(map)
    }
    show(editor.center, circle.center)
    if (!draggingRadius.current) {
      show(editor.radius, destination(circle.center, circle.radiusKm, bearingRef.current))
    }
  }, [map, circle, color])

  return null
}
