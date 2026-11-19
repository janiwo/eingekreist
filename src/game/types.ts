import type { MultiPolygon, Polygon } from 'geojson'

/** [Längengrad, Breitengrad] in Grad, wie in GeoJSON. */
export type LngLat = [number, number]

export type Category =
  | 'country'
  | 'city'
  | 'island'
  | 'landscape'
  | 'water'
  | 'landmark'

export const CATEGORIES: readonly Category[] = [
  'country',
  'city',
  'island',
  'landscape',
  'water',
  'landmark',
]

export interface Place {
  id: string
  /** Deutscher Anzeigename. */
  name: string
  /** Optionaler Zusatz zur Unterscheidung, z. B. „Stadt in Kanada“. */
  qualifier?: string
  category: Category
  /** Bereits gepufferte, vereinfachte Fläche des Ortes. */
  geometry: Polygon | MultiPolygon
}

export interface Player {
  id: string
  name: string
  color: string
  score: number
}

export interface Circle {
  center: LngLat
  radiusKm: number
}

export interface Settings {
  targetScore: number
  /** Sekunden pro Zug; `null` = kein Zeitlimit. */
  turnSeconds: number | null
  showBorders: boolean
  categories: Category[]
}

export const DEFAULT_SETTINGS: Settings = {
  targetScore: 10,
  turnSeconds: 60,
  showBorders: true,
  categories: [...CATEGORIES],
}

export const MIN_RADIUS_KM = 1
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8
