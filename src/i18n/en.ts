import { MIN_RADIUS_KM } from '../game/types'
import type { Strings } from './de'

const kmFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })
const listFormat = new Intl.ListFormat('en', { type: 'conjunction' })
const ordinals = new Intl.PluralRules('en', { type: 'ordinal' })
const ORDINAL_SUFFIX: Record<Intl.LDMLPluralRule, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th', zero: 'th', many: 'th' }
const points = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`
const formatKm = (km: number) => `${kmFormat.format(km)} km`
// Shared by the turn buttons and the instructions that name them.
const submit = 'Submit'

export const en: Strings = {
  appName: 'Eingekreist',
  language: 'Language',
  showBorders: 'Show country borders',
  setup: {
    players: 'Players',
    defaultName: (n: number) => `Player ${n}`,
    playerName: (n: number) => `Name of player ${n}`,
    addPlayer: '+ Add player',
    removePlayer: (name: string) => `Remove ${name || 'player'}`,
    chooseColor: (name: string) => `Change the color of ${name || 'player'}`,
    colorNames: ['Red', 'Orange', 'Yellow', 'Green', 'Turquoise', 'Purple', 'Pink', 'Black'],
    settings: 'Settings',
    targetScore: 'Points to win',
    decrease: 'Fewer',
    decreaseSymbol: '−',
    increase: 'More',
    increaseSymbol: '+',
    removeSymbol: '✕',
    timer: 'Time per turn',
    timerOff: 'No time limit',
    seconds: (n: number) => `${n} seconds`,
    categories: 'Categories',
    atLeastOneCategory: 'At least one category must be on.',
    start: 'Start game',
    loading: 'Loading places …',
    loadError: 'The places could not be loaded. Please try again.',
    problems: {
      emptyName: 'Every player needs a name.',
      duplicateName: 'The names must be different.',
    },
  },
  game: {
    round: (n: number) => `Round ${n}`,
    targetScore: (n: number) => `Goal: ${points(n)}`,
    newGame: 'New game',
    newGameSymbol: '↺',
    confirmNewGame: 'This ends the current game.',
    confirm: 'Start new game',
    cancel: 'Keep playing',
    placeLoading: '…',
    loadError: 'The place could not be loaded.',
    retry: 'Try again',
    onTurn: (name: string) => `${name}’s turn`,
    handOver: 'Hand the device to',
    tapToStart: 'Tap to start',
    submit,
    timeLeft: 'Time left',
    seconds: (n: number) => `${n} s`,
    outcomes: {
      submitted: 'Circle submitted',
      timedOut: 'Time’s up',
    },
  },
  reveal: {
    title: (n: number) => `Round ${n}: results`,
    evaluating: 'Scoring …',
    winners: (names: string[]) =>
      `🏆 ${names.length === 1 ? `${names[0]} scores the point` : `${listFormat.format(names)} each score a point`}`,
    noWinner: 'Nobody hit – no point this round',
    player: 'Player',
    circle: 'Circle',
    result: 'Result',
    score: 'Points',
    hit: '✓ Hit',
    miss: '✗ Miss',
    out: 'Knocked out',
    toCircle: (name: string) => `Go to ${name}’s circle`,
    toPlace: (name: string) => `Go to the target: ${name}`,
    toPlaceSymbol: '📍',
    collapse: 'Collapse results',
    collapseSymbol: '▾',
    expand: 'Show results',
    expandSymbol: '▴',
    pointGained: '+1',
    suddenDeath: (names: string[], n: number) =>
      `Tied at ${points(n)}: sudden death! Only ${listFormat.format(names)} play on until one of them leads alone.`,
    nextRound: 'Next round',
    toResults: 'See the result',
  },
  end: {
    title: 'Game over',
    winner: (name: string) => `🏆 ${name} wins!`,
    draw: (names: string[]) => `Draw: ${listFormat.format(names)}`,
    rounds: (n: number) => `after ${n} ${n === 1 ? 'round' : 'rounds'}`,
    rank: (n: number) => `${n}${ORDINAL_SUFFIX[ordinals.select(n)]}`,
    points,
    playAgain: 'Play again',
    playAgainHint: 'Same players, same settings',
    newGame: 'New game',
  },
  circle: {
    placeHint: 'Tap the globe to place your circle',
    radius: 'Radius',
    moveCenter: 'Move the center',
    changeRadius: 'Change the radius',
    minRadius: `Smallest circle (${formatKm(MIN_RADIUS_KM)})`,
    moveCenterKeys: 'Arrow keys move the circle, with Shift in large steps.',
    changeRadiusKeys: 'Arrow up or right enlarges, down or left shrinks, with Shift in large steps.',
    globeLabel: 'Globe. Arrow keys turn it, plus and minus zoom, Enter places the circle in the center.',
  },
  howToPlay: {
    title: 'How to play',
    openSymbol: '?',
    close: 'Close',
    closeSymbol: '✕',
    done: 'Got it',
    goal: {
      title: 'Goal',
      text: [
        'Each round names a place. Draw a circle on the globe that overlaps it – the smaller, the better. The smallest circle that hits scores the point.',
      ],
    },
    round: {
      title: 'A round',
      text: [
        'You take turns on one device.',
        'Tap the globe to set the center of your circle.',
        `Use the handles to move the circle or change its radius. Press “${submit}” when you are happy with your circle. If there is a time limit, your circle is submitted automatically when the time runs out.`,
        'Once all circles are in, the round is scored.',
      ],
    },
    scoring: {
      title: 'Scoring',
      text: [
        'The smallest circle that overlaps the place wins. If the smallest hits are the same size, each of them gets a point.',
      ],
    },
    tip: `Tip: The smallest radius is ${formatKm(MIN_RADIUS_KM)}. If you are sure, the target button shrinks your circle to that size.`,
    end: {
      title: 'End of the game',
      text: [
        'The first to reach the target score wins. On a tie, sudden death decides until only one player is left.',
      ],
    },
    figure: {
      label: 'Example: three circles around a place',
      winner: 'Smallest hit – scores the point',
      bigger: 'Hits as well, but is bigger',
      miss: 'Even smaller, but misses',
      trophy: '🏆',
    },
  },
  formatKm,
  credits: {
    label: 'Map data:',
    naturalEarth: 'Natural Earth',
    osm: '© OpenStreetMap contributors',
  },
  mapLocale: {
    'Map.Title': 'Globe. Arrow keys turn it, plus and minus zoom.',
    'Marker.Title': 'Marker',
    'AttributionControl.ToggleAttribution': 'Show or hide the credits',
    'AttributionControl.MapFeedback': 'Map feedback',
  },
  debugPlaces: {
    search: 'Place (name or ID)',
    loading: 'Loading places …',
    notFound: 'No place found',
    count: (n: number) => `${n} places`,
    vertices: (n: number) => `${n} points`,
  },
  categories: {
    country: { label: 'Country', plural: 'Countries' },
    city: { label: 'City', plural: 'Cities' },
    island: { label: 'Island', plural: 'Islands' },
    landscape: { label: 'Landscape', plural: 'Landscapes' },
    water: { label: 'Water', plural: 'Waters' },
    landmark: { label: 'Landmark', plural: 'Landmarks' },
  },
}
