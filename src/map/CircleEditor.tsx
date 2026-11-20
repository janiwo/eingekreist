import { useEffect, useRef } from 'react'
import type { Circle, LngLat } from '../game/types'
import { initialRadiusKm, roundRadiusKm, stepRadiusKm } from '../geo/circle'
import { bearingDeg, destination, distanceKm } from '../geo/sphere'
import { de } from '../i18n/de'
import { addCircleLayer } from './circleLayer'
import { Marker, Point, type Map as MapLibreMap, type MapMouseEvent } from './maplibre'

const LAYER_ID = 'edit-circle'

/** Bearing of the radius handle when a circle is first placed: east. */
const DEFAULT_HANDLE_BEARING = 90

/** Screen pixels the center moves per arrow key press (with Shift: the large step). */
const CENTER_KEY_STEP_PX = { small: 10, large: 50 }

/** Arrow keys as screen directions [x, y]. */
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

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
  // Custom marker elements get no keyboard support from MapLibre; the editor adds it.
  el.tabIndex = 0
  el.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight')
  el.dataset.testid = `handle-${kind}`
  return el
}

/** Whether the tapped pixel lies on the globe rather than in the space around it. */
function hitsGlobe(map: MapLibreMap, e: MapMouseEvent): boolean {
  return map.project(e.lngLat).dist(e.point) < 2
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
      // Hide handles on the far side of the globe (CSS also makes them unclickable).
      opacityWhenCovered: '0',
    })
    const radius = new Marker({
      element: handleElement('radius', de.circle.changeRadius),
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
      if (kind === 'radius') {
        const direction = arrow[0] - arrow[1] > 0 ? 1 : -1
        onChangeRef.current({ ...current, radiusKm: stepRadiusKm(current.radiusKm, direction, e.shiftKey) })
        return
      }
      const step = e.shiftKey ? CENTER_KEY_STEP_PX.large : CENTER_KEY_STEP_PX.small
      const at = map.project(current.center)
      const to = map.unproject(new Point(at.x + arrow[0] * step, at.y + arrow[1] * step))
      onChangeRef.current({ ...current, center: to.toArray() as LngLat })
    }
    const onCenterKey = onKey('center')
    const onRadiusKey = onKey('radius')
    center.getElement().addEventListener('keydown', onCenterKey)
    radius.getElement().addEventListener('keydown', onRadiusKey)

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
    const onCanvasKey = (e: KeyboardEvent) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== canvas) return
      e.preventDefault()
      place(map.getCenter().toArray() as LngLat)
    }
    canvas.addEventListener('keydown', onCanvasKey)

    const onClick = (e: MapMouseEvent) => {
      // Taps on a handle bubble up to the map; they must not move the circle.
      if ((e.originalEvent.target as Element).closest('.maplibregl-marker')) return
      // Taps in space next to the globe unproject to the nearest point on its edge.
      if (!hitsGlobe(map, e)) return
      place(e.lngLat.toArray() as LngLat)
    }
    map.on('click', onClick)

    return () => {
      map.off('click', onClick)
      canvas.removeEventListener('keydown', onCanvasKey)
      center.getElement().removeEventListener('keydown', onCenterKey)
      radius.getElement().removeEventListener('keydown', onRadiusKey)
      center.remove()
      radius.remove()
      draggingRadius.current = false
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
  }, [map, circle, color])

  return null
}
