import type { Category } from '../game/types'

/** Icon and accent color of each category (prompt card, setup chips). The same in every language. */
export const CATEGORY_THEME: Record<Category, { icon: string; color: string }> = {
  country: { icon: '🏳️', color: '#c0392b' },
  city: { icon: '🏙️', color: '#7f8c8d' },
  island: { icon: '🏝️', color: '#16a085' },
  landscape: { icon: '🏜️', color: '#d4a656' },
  water: { icon: '🌊', color: '#2e86de' },
  landmark: { icon: '🏛️', color: '#8e44ad' },
}
