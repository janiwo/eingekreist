import { MIN_RADIUS_KM, type Category } from '../game/types'

const kmFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const listFormat = new Intl.ListFormat('de', { type: 'conjunction' })
const points = (n: number) => `${n} ${n === 1 ? 'Punkt' : 'Punkte'}`
const formatKm = (km: number) => `${kmFormat.format(km)} km`
// Shared by the turn buttons and the instructions that name them.
const submit = 'Abgeben'

export const de = {
  appName: 'Eingekreist',
  /** Accessible name of the language switch. */
  language: 'Sprache',
  showBorders: 'Ländergrenzen anzeigen',
  setup: {
    players: 'Spieler',
    playerName: (n: number) => `Name von Spieler ${n}`,
    addPlayer: '+ Spieler hinzufügen',
    removePlayer: (name: string) => `${name || 'Spieler'} entfernen`,
    chooseColor: (name: string) => `Farbe von ${name || 'Spieler'} ändern`,
    /** Names of the player colors, in palette order (PLAYER_COLORS). */
    colorNames: ['Rot', 'Orange', 'Gelb', 'Grün', 'Türkis', 'Lila', 'Pink', 'Schwarz'],
    settings: 'Einstellungen',
    targetScore: 'Punkte zum Sieg',
    decrease: 'Weniger',
    decreaseSymbol: '−',
    increase: 'Mehr',
    increaseSymbol: '+',
    removeSymbol: '✕',
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
    targetScore: (n: number) => `Ziel: ${points(n)}`,
    newGame: 'Neues Spiel',
    /** In place of the label on narrow screens. */
    newGameSymbol: '↺',
    confirmNewGame: 'Das laufende Spiel wird beendet.',
    confirm: 'Neues Spiel starten',
    cancel: 'Weiterspielen',
    placeLoading: '…',
    loadError: 'Der Ort konnte nicht geladen werden.',
    retry: 'Erneut versuchen',
    onTurn: (name: string) => `${name} ist dran`,
    handOver: 'Gib das Gerät an',
    tapToStart: 'Tippen zum Starten',
    submit,
    timeLeft: 'Verbleibende Zeit',
    seconds: (n: number) => `${n} s`,
    outcomes: {
      submitted: 'Kreis abgegeben',
      timedOut: 'Zeit abgelaufen',
    },
  },
  reveal: {
    title: (n: number) => `Auflösung Runde ${n}`,
    evaluating: 'Auswertung …',
    winners: (names: string[]) =>
      `🏆 ${names.length === 1 ? `${names[0]} holt den Punkt` : `${listFormat.format(names)} holen je einen Punkt`}`,
    noWinner: 'Niemand hat getroffen – kein Punkt in dieser Runde',
    player: 'Spieler',
    circle: 'Kreis',
    result: 'Ergebnis',
    score: 'Punkte',
    hit: '✓ Treffer',
    miss: '✗ Daneben',
    /** In place of the radius for a player knocked out in sudden death. */
    out: 'Ausgeschieden',
    /** Tooltip of a player's name: the globe flies to their circle. */
    toCircle: (name: string) => `Zum Kreis von ${name}`,
    /** The button back to the place, after looking at circles or moving the globe. */
    toPlace: (name: string) => `Zum Ziel: ${name}`,
    toPlaceSymbol: '📍',
    /** The toggle that folds the result card into a slim bar, so the map shows in full. */
    collapse: 'Ergebnisse einklappen',
    collapseSymbol: '▾',
    expand: 'Ergebnisse anzeigen',
    expandSymbol: '▴',
    /** Badge next to the score of a round winner. */
    pointGained: '+1',
    suddenDeath: (names: string[], n: number) =>
      `Gleichstand bei ${points(n)}: Stechen! Nur ${listFormat.format(names)} spielen weiter, bis einer allein vorne liegt.`,
    nextRound: 'Nächste Runde',
    toResults: 'Zum Ergebnis',
  },
  end: {
    title: 'Spielende',
    winner: (name: string) => `🏆 ${name} gewinnt!`,
    /** Only when the places ran out with several players on top. */
    draw: (names: string[]) => `Unentschieden: ${listFormat.format(names)}`,
    rounds: (n: number) => `nach ${n} ${n === 1 ? 'Runde' : 'Runden'}`,
    rank: (n: number) => `${n}.`,
    points,
    playAgain: 'Nochmal spielen',
    playAgainHint: 'Gleiche Spieler, gleiche Einstellungen',
    newGame: 'Neues Spiel',
  },
  circle: {
    placeHint: 'Tippe auf den Globus, um deinen Kreis zu setzen',
    radius: 'Radius',
    moveCenter: 'Mittelpunkt verschieben',
    changeRadius: 'Radius ändern',
    /** The button that shrinks the circle to the minimum radius. */
    minRadius: `Kleinster Kreis (${formatKm(MIN_RADIUS_KM)})`,
    /** Accessible descriptions of the handles' keys. */
    moveCenterKeys: 'Pfeiltasten verschieben den Kreis, mit Umschalt in großen Schritten.',
    changeRadiusKeys: 'Pfeil hoch oder rechts vergrößert, runter oder links verkleinert, mit Umschalt in großen Schritten.',
    /** The globe's accessible name during a turn. */
    globeLabel:
      'Globus. Pfeiltasten drehen ihn, Plus und Minus zoomen, die Eingabetaste setzt den Kreis in die Mitte.',
  },
  howToPlay: {
    title: 'So wird gespielt',
    /** Label of the compact button in the game bar. */
    openSymbol: '?',
    close: 'Schließen',
    closeSymbol: '✕',
    done: 'Verstanden',
    goal: {
      title: 'Ziel',
      text: [
        'Jede Runde wird ein Ort genannt. Zeichne auf dem Globus einen Kreis, der ihn überlappt – je kleiner, desto besser. Der kleinste Kreis, der trifft, holt den Punkt.',
      ],
    },
    round: {
      title: 'Eine Runde',
      text: [
        'Ihr spielt reihum auf einem Gerät.',
        'Tippe auf den Globus, um den Mittelpunkt deines Kreises zu setzen.',
        `Mit den Griffen verschiebst du den Kreis oder änderst den Radius. Drücke auf „${submit}“, wenn du mit deinem Kreis zufrieden bist. Ist ein Zeitlimit eingestellt, wird dein Kreis automatisch abgegeben, sobald die Zeit abläuft.`,
        'Sobald alle Kreise abgegeben sind, wird ausgewertet.',
      ],
    },
    scoring: {
      title: 'Wertung',
      text: [
        'Es gewinnt der kleinste Kreis, der den Ort überlappt. Sind die kleinsten Treffer gleich groß, bekommen alle einen Punkt.',
      ],
    },
    tip: `Tipp: Der kleinste Radius ist ${formatKm(MIN_RADIUS_KM)}. Bist du dir sicher, schrumpft das Zielscheiben-Symbol deinen Kreis auf diese Größe.`,
    end: {
      title: 'Spielende',
      text: [
        'Wer zuerst die Zielpunktzahl erreicht, gewinnt. Bei Gleichstand geht es ins Stechen, bis nur noch eine Person übrig bleibt.',
      ],
    },
    /** The scoring illustration. */
    figure: {
      label: 'Beispiel: Drei Kreise um einen Ort',
      winner: 'Kleinster Treffer – holt den Punkt',
      bigger: 'Trifft auch, ist aber größer',
      miss: 'Noch kleiner, aber daneben',
      trophy: '🏆',
    },
  },
  formatKm,
  /** Map data credits (src/map/dataSources.ts): on the map and, as the map's collapses on phones, the start screen. */
  credits: {
    label: 'Kartendaten:',
    naturalEarth: 'Natural Earth',
    osm: '© OpenStreetMap-Mitwirkende',
  },
  /** MapLibre's own UI strings (only those of the controls and handlers in use). */
  mapLocale: {
    'Map.Title': 'Globus. Pfeiltasten drehen ihn, Plus und Minus zoomen.',
    'Marker.Title': 'Markierung',
    'AttributionControl.ToggleAttribution': 'Quellenangaben ein- oder ausblenden',
    'AttributionControl.MapFeedback': 'Feedback zur Karte',
  },
  /** Dev-only place inspector (`?debug=places`). */
  debugPlaces: {
    search: 'Ort (Name oder ID)',
    loading: 'Orte werden geladen …',
    notFound: 'Kein Ort gefunden',
    count: (n: number) => `${n} Orte`,
    vertices: (n: number) => `${n} Punkte`,
  },
  categories: {
    country: { label: 'Land', plural: 'Länder' },
    city: { label: 'Stadt', plural: 'Städte' },
    island: { label: 'Insel', plural: 'Inseln' },
    landscape: { label: 'Landschaft', plural: 'Landschaften' },
    water: { label: 'Gewässer', plural: 'Gewässer' },
    landmark: { label: 'Sehenswürdigkeit', plural: 'Sehenswürdigkeiten' },
  } satisfies Record<Category, { label: string; plural: string }>,
}

export type Strings = typeof de
