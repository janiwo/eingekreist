// MapLibre sucht seinen Worker relativ zu import.meta.url. Das klappt nicht, wenn Vite das
// Paket vorbündelt (Dev) oder umbenennt (Build). Daher den Worker explizit als Asset einbinden.
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(workerUrl)

export * from 'maplibre-gl'
