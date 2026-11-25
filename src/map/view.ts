import { HALF_CIRCUMFERENCE_KM } from '../geo/sphere'

/** Start view for every turn (spec §2). */
export const START_VIEW = { center: [10, 20] as [number, number], zoom: 1.4, bearing: 0, pitch: 0 }

/** MapLibre's world is 512 px wide at zoom 0. */
const WORLD_PX_AT_ZOOM_0 = 512

/** Web Mercator's latitude limit; MapLibre's globe scales like Mercator only up to here. */
const MAX_MERCATOR_LAT = 85.051129

/** Zoom levels to add at latitude `lat` for the scale the globe has at the equator. */
function latitudeZoomShift(lat: number): number {
  const clamped = Math.min(Math.abs(lat), MAX_MERCATOR_LAT)
  return Math.log2(Math.cos((clamped * Math.PI) / 180))
}

/**
 * The zoom at which `radiusKm` spans `gapPx` screen pixels at latitude `lat`
 * (Web Mercator scale, which the globe matches once zoomed in this far; beyond
 * MAX_MERCATOR_LAT the globe keeps the scale of that latitude).
 */
export function zoomForRadius(radiusKm: number, gapPx: number, lat: number): number {
  const kmPerPx = radiusKm / gapPx
  return Math.log2((2 * HALF_CIRCUMFERENCE_KM) / (WORLD_PX_AT_ZOOM_0 * kmPerPx)) + latitudeZoomShift(lat)
}

/**
 * Camera flights that bring something into view (the 1 km button, the reveal's focus): long
 * enough to follow, short enough not to eat the turn time.
 */
export const FOCUS_FLIGHT_MS = 1000

/** How far the reveal zooms in on a player's circle: a 1 km circle still shows clearly. */
export const CIRCLE_MAX_ZOOM = 14
/**
 * At the equator, the globe is whole below this zoom; larger circles reach past its horizon
 * anyway. Elsewhere the limit shifts with the latitude, like any zoom (see `zoomForRadius`).
 */
const CIRCLE_MIN_ZOOM = 1
/** Share of the free area's shorter side the circle's diameter fills. */
const CIRCLE_FILL = 0.8

/** Screen space to keep free, in px (like MapLibre's `PaddingOptions`). */
export interface Padding {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Camera that shows the circle `center`/`radiusKm` in the middle of the free area of a
 * `width` × `height` viewport, as large as fits. The offset moves the center into the free
 * area; unlike MapLibre's `padding`, it does not stay on the map after the flight.
 */
export function circleCamera(
  center: [number, number],
  radiusKm: number,
  padding: Padding,
  width: number,
  height: number,
): { center: [number, number]; zoom: number; offset: [number, number] } {
  const free = Math.max(1, Math.min(width - padding.left - padding.right, height - padding.top - padding.bottom))
  const zoom = zoomForRadius(radiusKm, (free * CIRCLE_FILL) / 2, center[1])
  return {
    center,
    zoom: Math.min(CIRCLE_MAX_ZOOM, Math.max(CIRCLE_MIN_ZOOM + latitudeZoomShift(center[1]), zoom)),
    offset: [(padding.left - padding.right) / 2, (padding.top - padding.bottom) / 2],
  }
}
