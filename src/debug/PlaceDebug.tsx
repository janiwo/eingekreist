import type { FeatureCollection, LineString, MultiLineString, MultiPolygon, Polygon } from 'geojson'
import { useEffect, useState } from 'react'
import { loadPlaces } from '../data/places'
import type { Place } from '../game/types'
import { placeBounds, placeOutline } from '../geo/placeView'
import { de } from '../i18n/de'
import type { GeoJSONSource, Map as MapLibreMap } from '../map/maplibre'
import { findPlace } from './findPlace'

const SOURCE = 'debug-place'
const strings = de.debugPlaces

type Shape = Polygon | MultiPolygon | LineString | MultiLineString

function placeFeatures(place: Place | undefined): FeatureCollection<Shape> {
  if (!place) return { type: 'FeatureCollection', features: [] }
  const color = de.categories[place.category].color
  return {
    type: 'FeatureCollection',
    features: [place.geometry, placeOutline(place.geometry)].map((geometry) => ({
      type: 'Feature',
      properties: { color },
      geometry,
    })),
  }
}

const vertexCount = (p: Place) =>
  (p.geometry.type === 'Polygon' ? [p.geometry.coordinates] : p.geometry.coordinates).flat(2).length

/**
 * Dev-only inspector (`?debug=places`, optionally `&place=<id or name>`): shows one place
 * of the dataset on the globe and fits the view to it.
 */
export default function PlaceDebug({ map }: { map: MapLibreMap }) {
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('place') ?? '')
  const [shownId, setShownId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void loadPlaces().then((p) => alive && setPlaces(p))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    map.addSource(SOURCE, { type: 'geojson', data: placeFeatures(undefined) })
    map.addLayer({
      id: `${SOURCE}-fill`,
      type: 'fill',
      source: SOURCE,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.35, 'fill-antialias': false },
    })
    map.addLayer({
      id: `${SOURCE}-line`,
      type: 'line',
      source: SOURCE,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
    })
    return () => {
      // The map may already be gone if the globe unmounted first.
      if (!map.style) return
      map.removeLayer(`${SOURCE}-line`)
      map.removeLayer(`${SOURCE}-fill`)
      map.removeSource(SOURCE)
    }
  }, [map])

  const place = places ? findPlace(places, query) : undefined

  useEffect(() => {
    map.getSource<GeoJSONSource>(SOURCE)?.setData(placeFeatures(place))
    if (!place) return
    map.fitBounds(placeBounds(place.geometry), { padding: 40, maxZoom: 12, animate: false })
    // Ready for screenshots once the new view has rendered.
    map.once('idle', () => setShownId(place.id))
  }, [map, place])

  return (
    <div className="debug-panel" data-ready={place !== undefined && shownId === place.id}>
      <input
        aria-label={strings.search}
        placeholder={strings.search}
        list="debug-places"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <datalist id="debug-places">
        {places?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({de.categories[p.category].label})
          </option>
        ))}
      </datalist>
      <div role="status" aria-live="polite" data-testid="debug-place-info">
        {!places
          ? strings.loading
          : place
            ? `${de.categories[place.category].icon} ${place.name}${place.qualifier ? ` (${place.qualifier})` : ''} · ${place.id} · ${strings.vertices(vertexCount(place))}`
            : query
              ? strings.notFound
              : strings.count(places.length)}
      </div>
    </div>
  )
}
