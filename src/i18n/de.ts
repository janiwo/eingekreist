import type { Category } from '../game/types'

const kmFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export const de = {
  appName: 'Eingekreist',
  showBorders: 'Ländergrenzen anzeigen',
  circle: {
    placeHint: 'Tippe auf den Globus, um deinen Kreis zu setzen',
    radius: 'Radius',
    moveCenter: 'Mittelpunkt verschieben',
    changeRadius: 'Radius ändern',
  },
  formatKm: (km: number) => `${kmFormat.format(km)} km`,
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
