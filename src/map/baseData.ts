import type { FeatureCollection, MultiLineString, LineString, MultiPolygon, Polygon } from 'geojson'
import bordersJson from '../data/basemap/borders.json'
import landJson from '../data/basemap/land.json'

// Natural Earth 1:50m, public domain. Generated with `npm run fetch:basemap`.

export const landGeoJson = landJson as FeatureCollection<Polygon | MultiPolygon>

/** Only land borders between countries, no coastlines. */
export const bordersGeoJson = bordersJson as FeatureCollection<LineString | MultiLineString>
