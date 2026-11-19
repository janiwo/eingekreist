import { drawPlace, type PlacePool } from './draw'
import type { RngState } from './rng'
import {
  CATEGORIES,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Category,
  type Player,
  type Settings,
} from './types'

/** Player colors, in the order they are handed out. Chosen to stand out on land and sea. */
export const PLAYER_COLORS = [
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#00acc1',
  '#8e24aa',
  '#d81b60',
  '#212121',
] as const

export const MIN_TARGET_SCORE = 1
export const MAX_TARGET_SCORE = 99

/** Default name for player number `n` (1-based); supplied by the UI, which owns the texts. */
export type DefaultName = (n: number) => string

export interface PlayerDraft {
  id: string
  name: string
  color: string
}

export interface SetupState {
  phase: 'setup'
  players: PlayerDraft[]
  settings: Settings
}

export interface Round {
  /** 1-based. */
  number: number
  placeId: string
  category: Category
}

export interface PlayingState {
  phase: 'playing'
  players: Player[]
  settings: Settings
  /** PRNG state for the next draw. */
  rng: RngState
  /** Every place drawn so far in this game, including the current one. */
  usedPlaceIds: string[]
  round: Round
}

export type GameState = SetupState | PlayingState

export type GameAction =
  | { type: 'addPlayer'; defaultName: DefaultName }
  | { type: 'removePlayer'; id: string }
  | { type: 'renamePlayer'; id: string; name: string }
  | { type: 'setPlayerColor'; id: string; color: string }
  | { type: 'updateSettings'; settings: Partial<Omit<Settings, 'categories'>> }
  | { type: 'toggleCategory'; category: Category }
  | { type: 'start'; pool: PlacePool; seed: RngState }
  /** Abandons whatever is going on and returns to a fresh setup. */
  | { type: 'newGame'; defaultName: DefaultName }

export function createSetup(defaultName: DefaultName): SetupState {
  let players: PlayerDraft[] = []
  for (let i = 0; i < MIN_PLAYERS; i++) players = withNewPlayer(players, defaultName)
  return { phase: 'setup', players, settings: { ...DEFAULT_SETTINGS, categories: [...CATEGORIES] } }
}

/** Adds a player with the lowest free number (ID `p<n>`, default name) and the first free color. */
function withNewPlayer(players: PlayerDraft[], defaultName: DefaultName): PlayerDraft[] {
  const ids = new Set(players.map((p) => p.id))
  let n = 1
  while (ids.has(`p${n}`)) n++
  const taken = new Set(players.map((p) => p.color))
  const color = PLAYER_COLORS.find((c) => !taken.has(c)) ?? PLAYER_COLORS[0]
  return [...players, { id: `p${n}`, name: defaultName(n), color }]
}

export type SetupProblem = 'emptyName' | 'duplicateName'

/** What keeps the setup from being started; empty when it can start. */
export function setupProblems(setup: SetupState): SetupProblem[] {
  const names = setup.players.map((p) => p.name.trim().toLocaleLowerCase('de'))
  const problems: SetupProblem[] = []
  if (names.some((n) => n === '')) problems.push('emptyName')
  if (new Set(names.filter(Boolean)).size < names.filter(Boolean).length) problems.push('duplicateName')
  return problems
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function reduceSetup(state: SetupState, action: GameAction): GameState {
  switch (action.type) {
    case 'addPlayer':
      if (state.players.length >= MAX_PLAYERS) return state
      return { ...state, players: withNewPlayer(state.players, action.defaultName) }

    case 'removePlayer':
      if (state.players.length <= MIN_PLAYERS) return state
      return { ...state, players: state.players.filter((p) => p.id !== action.id) }

    case 'renamePlayer':
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.id ? { ...p, name: action.name } : p)),
      }

    case 'setPlayerColor': {
      const me = state.players.find((p) => p.id === action.id)
      if (!me || !(PLAYER_COLORS as readonly string[]).includes(action.color)) return state
      // Colors stay unique: whoever had the color gets the old one.
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === me.id
            ? { ...p, color: action.color }
            : p.color === action.color
              ? { ...p, color: me.color }
              : p,
        ),
      }
    }

    case 'updateSettings': {
      const s = { ...state.settings, ...action.settings }
      s.targetScore = clamp(Math.round(s.targetScore) || MIN_TARGET_SCORE, MIN_TARGET_SCORE, MAX_TARGET_SCORE)
      if (s.turnSeconds !== null && !(s.turnSeconds > 0)) s.turnSeconds = DEFAULT_SETTINGS.turnSeconds
      return { ...state, settings: s }
    }

    case 'toggleCategory': {
      const active = state.settings.categories
      const on = active.includes(action.category)
      if (on && active.length === 1) return state // at least one stays active
      // Kept in canonical order.
      const categories = CATEGORIES.filter((c) => (c === action.category ? !on : active.includes(c)))
      return { ...state, settings: { ...state.settings, categories } }
    }

    case 'start': {
      if (setupProblems(state).length > 0) return state
      const draw = drawPlace(action.pool, state.settings.categories, [], action.seed)
      if (!draw) return state
      return {
        phase: 'playing',
        players: state.players.map((p) => ({ ...p, name: p.name.trim(), score: 0 })),
        settings: state.settings,
        rng: draw.rng,
        usedPlaceIds: [draw.placeId],
        round: { number: 1, placeId: draw.placeId, category: draw.category },
      }
    }

    default:
      return state
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'newGame') return createSetup(action.defaultName)
  return state.phase === 'setup' ? reduceSetup(state, action) : state
}
