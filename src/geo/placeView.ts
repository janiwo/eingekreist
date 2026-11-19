import type { MultiLineString, MultiPolygon, Polygon, Position } from 'geojson'

const polygonsOf = (g: Polygon | MultiPolygon): Position[][][] =>
  g.type === 'Polygon' ? [g.coordinates] : g.coordinates

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
  const points = polygonsOf(geometry).flat(2)
  const lats = points.map((p) => p[1])
  const [south, north] = [Math.min(...lats), Math.max(...lats)]
  const box = (lngs: number[]): Bounds => [Math.min(...lngs), south, Math.max(...lngs), north]

  const plain = box(points.map((p) => p[0]))
  const shifted = box(points.map((p) => (p[0] < 0 ? p[0] + 360 : p[0])))
  return shifted[2] - shifted[0] < plain[2] - plain[0] ? shifted : plain
}
