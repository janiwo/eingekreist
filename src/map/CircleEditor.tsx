import { useEffect, useRef } from 'react'
import type { Circle, LngLat } from '../game/types'
import { initialRadiusKm, roundRadiusKm, stepRadiusKm } from '../geo/circle'
import { bearingDeg, destination, distanceKm } from '../geo/sphere'
import { useI18n } from '../i18n/context'
import { addCircleLayer } from './circleLayer'
import { Marker, type Map as MapLibreMap, type MapMouseEvent } from './maplibre'

const LAYER_ID = 'edit-circle'

/** Bearing of the radius handle when a circle is first placed: east. */
const DEFAULT_HANDLE_BEARING = 90

/** Screen pixels the center moves per arrow key press (with Shift: the large step). */
const CENTER_KEY_STEP_PX = { small: 10, large: 50 }

/** Arrow keys: compass bearing for the center, and the radius direction (up/right larger). */
const ARROWS: Record<string, { bearing: number; radius: 1 | -1 }> = {
  ArrowUp: { bearing: 0, radius: 1 },
  ArrowRight: { bearing: 90, radius: 1 },
  ArrowDown: { bearing: 180, radius: -1 },
  ArrowLeft: { bearing: 270, radius: -1 },
}

interface CircleEditorProps {
  map: MapLibreMap
  circle: Circle | null
  onChange: (circle: Circle) => void
  color?: string
}

function handleElement(kind: 'center' | 'radius', label: string, keys: string): HTMLElement {
  const el = document.createElement('div')
  el.className = `handle handle--${kind}`
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', label)
  // Custom marker elements get no keyboard support from MapLibre; the editor adds it.
  el.tabIndex = 0
  el.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight')
  el.setAttribute('aria-description', keys)
  el.dataset.testid = `handle-${kind}`
  return el
}

/** Whether the tapped pixel lies on the globe rather than in the space around it. */
function hitsGlobe(map: MapLibreMap, e: MapMouseEvent): boolean {
  return map.project(e.lngLat).dist(e.point) < 2
}

/** Map scale at the screen center, in km per pixel. */
function kmPerPixel(map: MapLibreMap): number {
  const { clientWidth: w, clientHeight: h } = map.getContainer()
  const a = map.unproject([w / 2, h / 2]).toArray() as LngLat
  const b = map.unproject([w / 2 + 10, h / 2]).toArray() as LngLat
  return distanceKm(a, b) / 10
}

/** Starting radius for a new circle, based on the map scale at the screen center. */
function initialRadiusFor(map: MapLibreMap): number {
  const { clientWidth: w, clientHeight: h } = map.getContainer()
  return initialRadiusKm(kmPerPixel(map), Math.min(w, h))
}

/**
 * Lets the player place a circle by tapping the globe and adjust it with two handles:
 * one moves the center, the other changes the radius.
 */
export function CircleEditor({ map, circle, onChange, color = '#ff5a36' }: CircleEditorProps) {
  const { t } = useI18n()
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
      element: handleElement('center', t.circle.moveCenter, t.circle.moveCenterKeys),
      draggable: true,
      // Hide handles on the far side of the globe (CSS also makes them unclickable).
      opacityWhenCovered: '0',
    })
    const radius = new Marker({
      element: handleElement('radius', t.circle.changeRadius, t.circle.changeRadiusKeys),
      draggable: true,
      // Hide handles on the far side of the globe (CSS also makes them unclickable).
      opacityWhenCovered: '0',
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

    // Arrow keys on a focused handle: move the center on screen, or step the radius
    // (up/right larger, down/left smaller). Shift takes larger steps.
    const onKey = (kind: 'center' | 'radius') => (e: KeyboardEvent) => {
      const arrow = ARROWS[e.key]
      const current = circleRef.current
      if (!arrow || !current || e.altKey || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      // The handles live in the map's canvas container: the map would pan as well.
      e.stopPropagation()
      // A handle on the far side of the globe is invisible: don't move what the player can't see.
      if ((e.currentTarget as Element).classList.contains('maplibregl-marker-covered')) return
      if (kind === 'radius') {
        onChangeRef.current({ ...current, radiusKm: stepRadiusKm(current.radiusKm, arrow.radius, e.shiftKey) })
        return
      }
      // Geographic step (the map never rotates, so up is north), sized by the map scale.
      const px = e.shiftKey ? CENTER_KEY_STEP_PX.large : CENTER_KEY_STEP_PX.small
      onChangeRef.current({ ...current, center: destination(current.center, px * kmPerPixel(map), arrow.bearing) })
    }
    // Removes all DOM listeners of the editor at once.
    const listeners = new AbortController()
    const { signal } = listeners
    center.getElement().addEventListener('keydown', onKey('center'), { signal })
    radius.getElement().addEventListener('keydown', onKey('radius'), { signal })

    const place = (at: LngLat) => {
      const current = circleRef.current
      if (current) {
        onChangeRef.current({ ...current, center: at })
      } else {
        bearingRef.current = DEFAULT_HANDLE_BEARING
        onChangeRef.current({ center: at, radiusKm: initialRadiusFor(map) })
      }
    }

    // Enter or Space on the focused globe places the circle at the center of the view
    // (the arrow keys turn the globe there, + and - zoom).
    const canvas = map.getCanvas()
    // Only now does Enter place a circle; say so in the globe's accessible name.
    const canvasLabel = canvas.getAttribute('aria-label')
    canvas.setAttribute('aria-label', t.circle.globeLabel)
    canvas.addEventListener(
      'keydown',
      (e) => {
        // Not on key repeat: a held Enter from the handover must not place a circle.
        if ((e.key !== 'Enter' && e.key !== ' ') || e.repeat || e.target !== canvas) return
        e.preventDefault()
        place(map.getCenter().toArray() as LngLat)
      },
      { signal },
    )

    // Whether the current press started on a handle. The click that ends it can land
    // outside the handle (a short drag the browser still counts as a tap), on the canvas.
    let pressOnHandle = false
    map.getContainer().addEventListener(
      'pointerdown',
      (e) => (pressOnHandle = (e.target as Element).closest('.maplibregl-marker') !== null),
      { capture: true, signal },
    )
    const onClick = (e: MapMouseEvent) => {
      // A press on a handle (tap or drag) must not move the circle.
      if (pressOnHandle) return
      // Taps in space next to the globe unproject to the nearest point on its edge.
      if (!hitsGlobe(map, e)) return
      place(e.lngLat.toArray() as LngLat)
    }
    map.on('click', onClick)

    return () => {
      map.off('click', onClick)
      listeners.abort()
      if (canvasLabel !== null) canvas.setAttribute('aria-label', canvasLabel)
      center.remove()
      radius.remove()
      draggingRadius.current = false
      editorRef.current = null
      layer.remove()
    }
  }, [map, t])

  // Sync geometry and handles with the circle (and with new handles, after a change of language).
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (!circle) {
      editor.layer.setCircles([])
      editor.center.remove()
      // Removing a marker mid-drag fires no dragend.
      editor.radius.remove()
      draggingRadius.current = false
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
  }, [map, circle, color, t])

  return null
}
