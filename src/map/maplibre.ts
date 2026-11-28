// MapLibre resolves its worker relative to import.meta.url, which breaks when Vite pre-bundles
// (dev) or renames (build) the package. So include the worker explicitly as an asset.
import { setWorkerUrl, type Map } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)

/**
 * Changes the UI strings of an existing map (MapLibre only takes them when the map is created).
 * Controls read them when added, so add those afresh afterwards.
 */
export function setMapLocale(map: Map, locale: Record<string, string>) {
  Object.assign(map._locale, locale)
  if (locale['Map.Title']) map.getCanvas().setAttribute('aria-label', locale['Map.Title'])
}

export * from 'maplibre-gl'
