import type { MultiLineString, MultiPolygon, Polygon, Position } from 'geojson'
import { polygonsOf } from './polygons'

/** An edge running along ±180°: where Natural Earth cuts areas at the antimeridian. */
const onSeam = (a: Position, b: Position) => Math.abs(a[0]) === 180 && a[0] === b[0]

/**
 * The place's outline for drawing, without the artificial edges along the antimeridian
 * (Russia, Fiji …), which are cuts in the data and not borders.
 */
export function placeOutline(geometry: Polygon | MultiPolygon): MultiLineString {
  const lines: Position[][] = []
  for (const ring of polygonsOf(geometry).flat()) {
    let line: Position[] = [ring[0]]
    for (let i = 1; i < ring.length; i++) {
      if (onSeam(ring[i - 1], ring[i])) {
        if (line.length > 1) lines.push(line)
        line = []
      }
      line.push(ring[i])
    }
    if (line.length > 1) lines.push(line)
  }
  return { type: 'MultiLineString', coordinates: lines }
}

/** [west, south, east, north]. `east` may exceed 180 for places across the antimeridian. */
export type Bounds = [number, number, number, number]

/**
 * Bounding box of the place. For a place on both sides of the antimeridian the box runs
 * across it (east > 180) rather than around the whole globe, whichever is narrower.
 */
export function placeBounds(geometry: Polygon | MultiPolygon): Bounds {
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity]
  // The same box with western-hemisphere longitudes shifted by +360°
  let [westShifted, eastShifted] = [Infinity, -Infinity]
  for (const rings of polygonsOf(geometry)) {
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        const shifted = lng < 0 ? lng + 360 : lng
        west = Math.min(west, lng)
        east = Math.max(east, lng)
        westShifted = Math.min(westShifted, shifted)
        eastShifted = Math.max(eastShifted, shifted)
        south = Math.min(south, lat)
        north = Math.max(north, lat)
      }
    }
  }
  return eastShifted - westShifted < east - west
    ? [westShifted, south, eastShifted, north]
    : [west, south, east, north]
}
