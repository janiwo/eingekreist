import type { Category } from '../game/types'

export const de = {
  appName: 'Eingekreist',
  showBorders: 'Ländergrenzen anzeigen',
  categories: {
    country: { label: 'Land', icon: '🏳️', color: '#c0392b' },
    city: { label: 'Stadt', icon: '🏙️', color: '#7f8c8d' },
    island: { label: 'Insel', icon: '🏝️', color: '#16a085' },
    landscape: { label: 'Landschaft', icon: '🏜️', color: '#d4a656' },
    water: { label: 'Gewässer', icon: '🌊', color: '#2e86de' },
    landmark: { label: 'Sehenswürdigkeit', icon: '🏛️', color: '#8e44ad' },
  } satisfies Record<Category, { label: string; icon: string; color: string }>,
}

export type Strings = typeof de
