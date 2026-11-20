import type { FeatureCollection, MultiLineString, MultiPolygon } from 'geojson'
import { decodeBaseMap, type BaseMapFile } from '../data/basemapCodec'
import bordersJson from '../data/basemap/borders.json'
import landJson from '../data/basemap/land.json'

// Natural Earth 1:50m, public domain. Generated with `npm run fetch:basemap`.

export const landGeoJson = decodeBaseMap(landJson as BaseMapFile) as FeatureCollection<MultiPolygon>

/** Only land borders between countries, no coastlines. */
export const bordersGeoJson = decodeBaseMap(bordersJson as BaseMapFile) as FeatureCollection<MultiLineString>
