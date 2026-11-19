import type { Category, LngLat } from '../../src/game/types.ts'

export type { LngLat }

/** [west, south, east, north] in degrees. */
export type BBox = [number, number, number, number]

/**
 * Where a place's geometry comes from. Names refer to the `name`/`NAME` property of the
 * Natural Earth 1:10m layer; several entries are merged into one place.
 */
export type Source =
  /** Admin-0 countries, by `ADM0_A3` code. */
  | { kind: 'country'; codes: string[] }
  /** Geography region polygons (deserts, mountain ranges, peninsulas …). */
  | { kind: 'region'; names: string[] }
  /** Marine polygons (seas, gulfs, straits, reefs). */
  | { kind: 'marine'; names: string[] }
  /** Lakes and reservoirs. */
  | { kind: 'lake'; names: string[] }
  /** River centerlines, buffered by `bufferKm`. `bbox` drops same-named rivers elsewhere. */
  | { kind: 'river'; names: string[]; bbox?: BBox; bufferKm: number }
  /** Land and minor-island polygons that contain one of the points. */
  | { kind: 'land'; at: LngLat[] }
  /** All land and minor-island polygons lying completely inside the box. */
  | { kind: 'landIn'; bbox: BBox }
  /** OpenStreetMap administrative boundaries, by relation ID. */
  | { kind: 'osm'; relations: number[] }
  /** A single coordinate, buffered by `bufferKm`. */
  | { kind: 'point'; at: LngLat; bufferKm: number }

export interface PlaceSource {
  /** Stable, unique, kebab-case. */
  id: string
  /** German display name. */
  name: string
  /** Disambiguation shown after the name, if the name alone is ambiguous in its category. */
  qualifier?: string
  category: Category
  source: Source
  /** Polygon parts lying completely inside one of these boxes are dropped. */
  exclude?: BBox[]
}

/** A list entry without its category; each list file sets the category for all its entries. */
export type Entry = Omit<PlaceSource, 'category'>
