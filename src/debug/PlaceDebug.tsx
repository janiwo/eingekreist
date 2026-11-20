import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlaces } from '../data/usePlaces'
import { placeBounds } from '../geo/placeView'
import { vertexCount } from '../geo/polygons'
import { de } from '../i18n/de'
import type { Map as MapLibreMap } from '../map/maplibre'
import { addShapeLayer, noFeatures, placeFeatures } from '../map/shapeLayer'
import { findPlace } from './findPlace'

const LAYER_ID = 'debug-place'
const strings = de.debugPlaces

/**
 * Dev-only inspector (`?debug=places`, optionally `&place=<id or name>`): shows one place
 * of the dataset on the globe and fits the view to it.
 */
export default function PlaceDebug({ map }: { map: MapLibreMap }) {
  const { places } = usePlaces()
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('place') ?? '')
  const [shownId, setShownId] = useState<string | null>(null)
  const layerRef = useRef<ReturnType<typeof addShapeLayer> | null>(null)

  useEffect(() => {
    const layer = addShapeLayer(map, LAYER_ID, { fillOpacity: 0.35, lineWidth: 2 })
    layerRef.current = layer
    return () => {
      layer.remove()
      layerRef.current = null
    }
  }, [map])

  const place = useMemo(() => (places ? findPlace(places, query) : undefined), [places, query])
  const options = useMemo(
    () =>
      places?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({de.categories[p.category].label})
        </option>
      )),
    [places],
  )

  useEffect(() => {
    // Runs after the layer effect above, which created the layer.
    layerRef.current?.setFeatures(place ? placeFeatures(place.geometry, de.categories[place.category].color) : noFeatures)
    if (!place) return
    map.fitBounds(placeBounds(place.geometry), { padding: 40, maxZoom: 12, animate: false })
    // Ready for screenshots once the new view has rendered.
    map.once('idle', () => setShownId(place.id))
  }, [map, place])

  return (
    <div className="debug-panel" data-ready={places !== null && (!place || shownId === place.id)}>
      <input
        aria-label={strings.search}
        placeholder={strings.search}
        list="debug-places"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <datalist id="debug-places">{options}</datalist>
      <div role="status" aria-live="polite" data-testid="debug-place-info">
        {!places
          ? strings.loading
          : place
            ? `${de.categories[place.category].icon} ${place.name}${place.qualifier ? ` (${place.qualifier})` : ''} · ${place.id} · ${strings.vertices(vertexCount(place.geometry))}`
            : query
              ? strings.notFound
              : strings.count(places.length)}
      </div>
    </div>
  )
}
