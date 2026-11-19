import type { FeatureCollection, MultiLineString, LineString, MultiPolygon, Polygon } from 'geojson'
import bordersJson from '../data/basemap/borders.json'
import landJson from '../data/basemap/land.json'

// Natural Earth 1:50m, gemeinfrei. Erzeugt mit `npm run fetch:basemap`.

export const landGeoJson = landJson as FeatureCollection<Polygon | MultiPolygon>

/** Nur Landgrenzen zwischen Ländern, keine Küsten. */
export const bordersGeoJson = bordersJson as FeatureCollection<LineString | MultiLineString>
