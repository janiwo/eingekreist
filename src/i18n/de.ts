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
  /** Map data credits (shown in the map's attribution control; HTML). */
  attribution: [
    '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap-Mitwirkende</a>',
    '<a href="https://www.naturalearthdata.com" target="_blank" rel="noopener">Natural Earth</a>',
  ],
  /** Dev-only place inspector (`?debug=places`). */
  debugPlaces: {
    search: 'Ort (Name oder ID)',
    loading: 'Orte werden geladen …',
    notFound: 'Kein Ort gefunden',
    count: (n: number) => `${n} Orte`,
    vertices: (n: number) => `${n} Punkte`,
  },
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
