import type { Category } from '../game/types'

const kmFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export const de = {
  appName: 'Eingekreist',
  showBorders: 'Ländergrenzen anzeigen',
  setup: {
    title: 'Neues Spiel',
    players: 'Spieler',
    defaultName: (n: number) => `Spieler ${n}`,
    playerName: (n: number) => `Name von Spieler ${n}`,
    addPlayer: 'Spieler hinzufügen',
    removePlayer: (name: string) => `${name || 'Spieler'} entfernen`,
    chooseColor: (name: string) => `Farbe von ${name || 'Spieler'} ändern`,
    /** Names of the player colors, in palette order (PLAYER_COLORS). */
    colorNames: ['Rot', 'Orange', 'Gelb', 'Grün', 'Türkis', 'Lila', 'Pink', 'Schwarz'],
    settings: 'Einstellungen',
    targetScore: 'Punkte zum Sieg',
    decrease: 'Weniger',
    increase: 'Mehr',
    timer: 'Zeit pro Zug',
    timerOff: 'Ohne Zeitlimit',
    seconds: (n: number) => `${n} Sekunden`,
    categories: 'Kategorien',
    atLeastOneCategory: 'Mindestens eine Kategorie muss aktiv sein.',
    start: 'Spiel starten',
    loading: 'Orte werden geladen …',
    loadError: 'Die Orte konnten nicht geladen werden. Bitte versuche es noch einmal.',
    problems: {
      emptyName: 'Jeder Spieler braucht einen Namen.',
      duplicateName: 'Die Namen müssen verschieden sein.',
    },
  },
  game: {
    round: (n: number) => `Runde ${n}`,
    targetScore: (n: number) => `Ziel: ${n} ${n === 1 ? 'Punkt' : 'Punkte'}`,
    newGame: 'Neues Spiel',
    confirmNewGame: 'Das laufende Spiel wird beendet.',
    confirm: 'Neues Spiel starten',
    cancel: 'Weiterspielen',
  },
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
    country: { label: 'Land', plural: 'Länder', icon: '🏳️', color: '#c0392b' },
    city: { label: 'Stadt', plural: 'Städte', icon: '🏙️', color: '#7f8c8d' },
    island: { label: 'Insel', plural: 'Inseln', icon: '🏝️', color: '#16a085' },
    landscape: { label: 'Landschaft', plural: 'Landschaften', icon: '🏜️', color: '#d4a656' },
    water: { label: 'Gewässer', plural: 'Gewässer', icon: '🌊', color: '#2e86de' },
    landmark: { label: 'Sehenswürdigkeit', plural: 'Sehenswürdigkeiten', icon: '🏛️', color: '#8e44ad' },
  } satisfies Record<Category, { label: string; plural: string; icon: string; color: string }>,
}

export type Strings = typeof de
