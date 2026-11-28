import { AttributionControl, Map as MapLibreMap, type StyleSpecification } from './maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { bordersGeoJson, landGeoJson } from './baseData'
import type { Circle, Settings } from '../game/types'
import { useI18n } from '../i18n/context'
import { attributionHtml } from './dataSources'
import { START_VIEW } from './view'

const COLORS = {
  space: '#0b1020',
  ocean: '#1d3a5c',
  land: '#cdbf9c',
  border: '#6b5d45',
}

const style: StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    land: { type: 'geojson', data: landGeoJson },
    borders: { type: 'geojson', data: bordersGeoJson },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': COLORS.ocean } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': COLORS.land } },
    {
      id: 'borders',
      type: 'line',
      source: 'borders',
      paint: { 'line-color': COLORS.border, 'line-width': 0.8 },
    },
  ],
  sky: { 'atmosphere-blend': 0.6 },
}

declare global {
  interface Window {
    /** Dev-only hooks for tests and the screenshot script. */
    __eingekreist?: {
      map: MapLibreMap
      /** Places or changes the current player's circle. */
      setCircle?: (circle: Circle) => void
      /** Starts a game with the current setup (optionally with a fixed seed and changed settings). */
      startGame?: (seed?: number, settings?: Partial<Omit<Settings, 'categories'>>) => Promise<void>
    }
  }
}

interface GlobeProps {
  showBorders: boolean
  /** Called with the map once it has loaded, and with `null` when it is removed. */
  onMapReady?: (map: MapLibreMap | null) => void
}

/** A compact attribution starts expanded and would cover the UI on phones; collapse it. */
const collapseAttribution = (container: HTMLElement | null) =>
  container?.querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show')

export function Globe({ showBorders, onMapReady }: GlobeProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onReadyRef = useRef(onMapReady)
  // The map is created once, in the language of that moment; the effect below follows changes.
  const initialLocale = useRef(t.mapLocale)

  useEffect(() => {
    onReadyRef.current = onMapReady
  }, [onMapReady])

  useEffect(() => {
    if (!containerRef.current) return
    const map = new MapLibreMap({
      container: containerRef.current,
      style,
      center: START_VIEW.center,
      zoom: START_VIEW.zoom,
      // Added below, in the current language.
      attributionControl: false,
      locale: initialLocale.current,
      renderWorldCopies: false,
      dragRotate: false,
      // A tap places the circle, so a double tap must not also zoom.
      doubleClickZoom: false,
      pitchWithRotate: false,
    })
    map.touchZoomRotate.disableRotation()
    // Shift + arrow keys would rotate and tilt the globe; keyboard players only pan and zoom.
    map.keyboard.disableRotation()
    mapRef.current = map
    map.once('load', () => {
      collapseAttribution(containerRef.current)
      onReadyRef.current?.(map)
    })
    // Access for browser tests (dev server only).
    if (import.meta.env.DEV) window.__eingekreist = { map }
    return () => {
      onReadyRef.current?.(null)
      map.remove()
      mapRef.current = null
      if (import.meta.env.DEV) delete window.__eingekreist
    }
  }, [])

  // MapLibre reads its UI strings when the map or a control is created: on a change of language,
  // update them and add the credits anew.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    Object.assign(map._locale, t.mapLocale)
    map.getCanvas().setAttribute('aria-label', t.mapLocale['Map.Title'])
    // Compact (behind an ⓘ button) on narrow maps only; MapLibre decides by width.
    const control = new AttributionControl({ customAttribution: attributionHtml(t) })
    map.addControl(control)
    collapseAttribution(containerRef.current)
    return () => {
      // Already gone if the map was removed first.
      if (map.hasControl(control)) map.removeControl(control)
    }
  }, [t])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () =>
      map.setLayoutProperty('borders', 'visibility', showBorders ? 'visible' : 'none')
    // `isStyleLoaded()` is also false while tiles load; `idle` comes after both the first
    // load and any loading in progress (`load` would only fire once).
    if (map.isStyleLoaded()) apply()
    else map.once('idle', apply)
  }, [showBorders])

  return <div ref={containerRef} className="globe" style={{ background: COLORS.space }} />
}
