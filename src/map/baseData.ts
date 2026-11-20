import { decodeLines, decodePolygons, type LineFile, type PolygonFile } from '../data/basemapCodec'
import bordersJson from '../data/basemap/borders.json'
import landJson from '../data/basemap/land.json'

// Natural Earth 1:50m, public domain. Generated with `npm run fetch:basemap`.

export const landGeoJson = decodePolygons(landJson as PolygonFile)

/** Only land borders between countries, no coastlines. */
export const bordersGeoJson = decodeLines(bordersJson as LineFile)
