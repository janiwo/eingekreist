import { MIN_RADIUS_KM, type Category } from '../game/types'

const kmFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })
const listFormat = new Intl.ListFormat('de', { type: 'conjunction' })
const points = (n: number) => `${n} ${n === 1 ? 'Punkt' : 'Punkte'}`
const formatKm = (km: number) => `${kmFormat.format(km)} km`
// Shared by the turn buttons and the instructions that name them.
const submit = 'Abgeben'
const pass = 'Passen'
/** Map data sources; OSM requires the credit (ODbL). */
const dataSources = [
  { name: 'Natural Earth', href: 'https://www.naturalearthdata.com' },
  { name: '© OpenStreetMap-Mitwirkende', href: 'https://www.openstreetmap.org/copyright' },
]

export const de = {
  appName: 'Eingekreist',
  showBorders: 'Ländergrenzen anzeigen',
  setup: {
    players: 'Spieler',
    defaultName: (n: number) => `Spieler ${n}`,
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
    pass,
    timeLeft: 'Verbleibende Zeit',
    seconds: (n: number) => `${n} s`,
    outcomes: {
      submitted: 'Kreis abgegeben',
      passed: 'Gepasst',
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
        'Jede Runde wird ein Ort genannt. Zeichne auf dem Globus einen Kreis, der ihn berührt – je kleiner, desto besser. Der kleinste Kreis, der trifft, holt den Punkt.',
      ],
    },
    round: {
      title: 'Eine Runde',
      text: [
        'Ihr spielt reihum auf einem Gerät. Wer dran ist, tippt zum Starten.',
        'Tippe auf den Globus, um den Mittelpunkt zu setzen. Mit den Griffen verschiebst du den Kreis oder änderst den Radius.',
        `Bist du zufrieden, tippe auf „${submit}“. Keine Ahnung? Dann „${pass}“.`,
        'Alle zeichnen geheim. Die Kreise der anderen siehst du erst bei der Auflösung.',
      ],
    },
    /** Last line of the round section; follows the timer setting. */
    turnTime: (seconds: number | null) =>
      seconds === null
        ? 'Es gibt kein Zeitlimit.'
        : `Du hast ${seconds} Sekunden. Läuft die Zeit ab, wird dein Kreis automatisch abgegeben.`,
    scoring: {
      title: 'Wertung',
      text: [
        'Jede Berührung zählt, auch ganz knapp am Rand. Besteht ein Ort aus mehreren Teilen, reicht einer davon.',
        'Es gilt der Umriss, der bei der Auflösung gezeigt wird.',
        'Sind die kleinsten Treffer gleich groß, bekommen alle einen Punkt. Trifft niemand, gibt es keinen Punkt.',
      ],
    },
    tip: `Tipp: Kreise schrumpfen bis auf ${formatKm(MIN_RADIUS_KM)} – wenn du dir sicher bist, mach ihn ganz klein.`,
    end: {
      title: 'Spielende',
      text: [
        'Erreichen mehrere das Ziel in derselben Runde, geht es ins Stechen: Nur wer gemeinsam vorne liegt, spielt weiter, bis einer allein führt.',
      ],
    },
    /** First line of the end section; follows the target score. */
    winAt: (targetScore: number) => `Wer zuerst ${points(targetScore)} hat, gewinnt.`,
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
  /** Credit line on the start screen (the map's attribution collapses on phones). */
  credits: {
    label: 'Kartendaten:',
    sources: dataSources,
  },
  /** MapLibre's own UI strings (only those of the controls and handlers in use). */
  mapLocale: {
    'Map.Title':
      'Globus. Pfeiltasten drehen ihn, Plus und Minus zoomen, die Eingabetaste setzt den Kreis in die Mitte.',
    'Marker.Title': 'Markierung',
    'AttributionControl.ToggleAttribution': 'Quellenangaben ein- oder ausblenden',
    'AttributionControl.MapFeedback': 'Feedback zur Karte',
  },
  /** Map data credits (shown in the map's attribution control; HTML). */
  attribution: dataSources.map((c) => `<a href="${c.href}" target="_blank" rel="noopener">${c.name}</a>`),
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
