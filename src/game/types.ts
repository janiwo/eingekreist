import type { MultiPolygon, Polygon } from 'geojson'

/** [longitude, latitude] in degrees, as in GeoJSON. */
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
  /** Display name (German). */
  name: string
  /** Optional disambiguation suffix, e.g. „Stadt in Kanada“. */
  qualifier?: string
  category: Category
  /** Already buffered, simplified area of the place. */
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
  /** Seconds per turn; `null` = no time limit. */
  turnSeconds: number | null
  showBorders: boolean
  categories: Category[]
}

export const DEFAULT_SETTINGS: Settings = {
  targetScore: 5,
  turnSeconds: 60,
  showBorders: true,
  categories: [...CATEGORIES],
}

export const MIN_RADIUS_KM = 1
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8
