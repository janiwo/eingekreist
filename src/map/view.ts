import { HALF_CIRCUMFERENCE_KM } from '../geo/sphere'

/** Start view for every turn (spec §2). */
export const START_VIEW = { center: [10, 20] as [number, number], zoom: 1.4, bearing: 0, pitch: 0 }

/** MapLibre's world is 512 px wide at zoom 0. */
const WORLD_PX_AT_ZOOM_0 = 512

/**
 * The zoom at which `radiusKm` spans `gapPx` screen pixels at latitude `lat`
 * (Web Mercator scale, which the globe matches once zoomed in this far).
 */
export function zoomForRadius(radiusKm: number, gapPx: number, lat: number): number {
  const kmPerPx = radiusKm / gapPx
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), 1e-6)
  return Math.log2((2 * HALF_CIRCUMFERENCE_KM * cos) / (WORLD_PX_AT_ZOOM_0 * kmPerPx))
}
