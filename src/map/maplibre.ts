// MapLibre resolves its worker relative to import.meta.url, which breaks when Vite pre-bundles
// (dev) or renames (build) the package. So include the worker explicitly as an asset.
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)

export * from 'maplibre-gl'
