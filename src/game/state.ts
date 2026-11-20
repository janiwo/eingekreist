import type { MultiPolygon, Polygon } from 'geojson'
import { roundRadiusKm } from '../geo/circle'
import { circleHits } from '../geo/hitTest'
import { drawPlace, type PlacePool } from './draw'
import type { RngState } from './rng'
import { gameWinner, roundWinners } from './scoring'
import {
  CATEGORIES,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Category,
  type Circle,
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

export type PlayerDraft = Omit<Player, 'score'>

export interface SetupState {
  phase: 'setup'
  players: PlayerDraft[]
  settings: Settings
}

/**
 * How a turn ended. A circle placed when time runs out is submitted automatically and counts
 * as `submitted`; `timedOut` means time ran out without a circle.
 */
export type TurnOutcome = 'submitted' | 'passed' | 'timedOut'

export interface Turn {
  playerId: string
  outcome: TurnOutcome
  /** Set exactly when the outcome is `submitted`. */
  circle: Circle | null
}

export interface Round {
  /** 1-based. */
  number: number
  placeId: string
  category: Category
  /**
   * Finished turns, in player order; the starting player is the same every round. The player
   * on turn is `players[turns.length]`; once every player has had a turn, the round is over.
   */
  turns: Turn[]
  /**
   * When the player on turn tapped „Start“ (ms since the epoch), so a reload keeps the timer
   * running; `null` while the handover screen is shown.
   */
  turnStartedAt: number | null
  /**
   * The circle the player on turn has placed so far, if any. Part of the saved game, so a
   * reload mid-turn keeps it; cleared when the turn ends.
   */
  draft: Circle | null
  /** Set once every player has had a turn and the round has been scored (the reveal). */
  result: RoundResult | null
}

export interface RoundResult {
  /** Players whose circle touched the place. */
  hitIds: string[]
  /** Players who got a point: the smallest hitting circle(s). Empty if nobody hit. */
  winnerIds: string[]
  /** This was the last round: someone leads alone at the target score, or no places are left. */
  gameOver: boolean
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

/** The game is over: someone reached the target score alone (or the places ran out). */
export interface FinishedState {
  phase: 'finished'
  players: Player[]
  settings: Settings
  /** Number of rounds played. */
  rounds: number
}

export type GameState = SetupState | PlayingState | FinishedState

export type GameAction =
  | { type: 'addPlayer' }
  | { type: 'removePlayer'; id: string }
  | { type: 'renamePlayer'; id: string; name: string }
  | { type: 'setPlayerColor'; id: string; color: string }
  | { type: 'updateSettings'; settings: Partial<Omit<Settings, 'categories'>> }
  | { type: 'toggleCategory'; category: Category }
  | { type: 'start'; pool: PlacePool; seed: RngState }
  /** The player on turn tapped the handover screen; `now` in ms since the epoch. */
  | { type: 'startTurn'; now: number }
  /** The player placed or changed their circle. */
  | { type: 'setDraft'; circle: Circle }
  /** Submits the placed circle. */
  | { type: 'submitTurn' }
  | { type: 'passTurn' }
  /** The timer ran out: a placed circle gets submitted, otherwise the turn is not submitted. */
  | { type: 'timeUp'; now: number }
  /** Every player has had a turn: scores the round against the place's area. */
  | { type: 'reveal'; geometry: Polygon | MultiPolygon; pool: PlacePool }
  /** After the reveal: the next round, or the end of the game. */
  | { type: 'nextRound'; pool: PlacePool }
  /** After the game: a new game with the same players and settings. */
  | { type: 'playAgain'; pool: PlacePool; seed: RngState }
  /** Abandons whatever is going on and returns to a fresh setup. */
  | { type: 'newGame' }

export function createSetup(defaultName: DefaultName): SetupState {
  let players: PlayerDraft[] = []
  for (let i = 0; i < MIN_PLAYERS; i++) players = withNewPlayer(players, defaultName)
  return { phase: 'setup', players, settings: { ...DEFAULT_SETTINGS } }
}

/** Adds a player with the lowest free number (ID `p<n>` and default name both unused) and the first free color. */
function withNewPlayer(players: PlayerDraft[], defaultName: DefaultName): PlayerDraft[] {
  const ids = new Set(players.map((p) => p.id))
  const names = new Set(players.map((p) => p.name.trim().toLocaleLowerCase('de')))
  let n = 1
  while (ids.has(`p${n}`) || names.has(defaultName(n).toLocaleLowerCase('de'))) n++
  const taken = new Set(players.map((p) => p.color))
  const color = PLAYER_COLORS.find((c) => !taken.has(c)) ?? PLAYER_COLORS[0]
  return [...players, { id: `p${n}`, name: defaultName(n), color }]
}

export type SetupProblem = 'emptyName' | 'duplicateName'

/** What keeps the setup from being started; empty when it can start. */
export function setupProblems(setup: SetupState): SetupProblem[] {
  const names = setup.players.map((p) => p.name.trim().toLocaleLowerCase('de'))
  const filled = names.filter(Boolean)
  const problems: SetupProblem[] = []
  if (filled.length < names.length) problems.push('emptyName')
  if (new Set(filled).size < filled.length) problems.push('duplicateName')
  return problems
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function reduceSetup(state: SetupState, action: GameAction, defaultName: DefaultName): GameState {
  switch (action.type) {
    case 'addPlayer':
      if (state.players.length >= MAX_PLAYERS) return state
      return { ...state, players: withNewPlayer(state.players, defaultName) }

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
        round: newRound(1, draw.placeId, draw.category),
      }
    }

    default:
      return state
  }
}

function newRound(number: number, placeId: string, category: Category): Round {
  return { number, placeId, category, turns: [], turnStartedAt: null, draft: null, result: null }
}

/** The player whose turn it is, or `null` once every player has had a turn this round. */
export function playerOnTurn(state: PlayingState): Player | null {
  return state.players[state.round.turns.length] ?? null
}

/** When the current turn's time runs out (ms since the epoch); `null` without a timer or before the turn started. */
export function turnDeadline(state: PlayingState): number | null {
  const { turnStartedAt } = state.round
  const { turnSeconds } = state.settings
  return turnStartedAt === null || turnSeconds === null ? null : turnStartedAt + turnSeconds * 1000
}

/** A circle that can be stored: finite coordinates on the globe, radius clamped and rounded like the editor's. */
function validCircle({ center: [lng, lat], radiusKm }: Circle): Circle | null {
  if (![lng, lat, radiusKm].every(Number.isFinite) || Math.abs(lat) > 90) return null
  return { center: [lng, lat], radiusKm: roundRadiusKm(radiusKm) }
}

function endTurn(state: PlayingState, player: Player, outcome: TurnOutcome, circle: Circle | null): PlayingState {
  const turn: Turn = { playerId: player.id, outcome, circle }
  return { ...state, round: { ...state.round, turns: [...state.round.turns, turn], turnStartedAt: null, draft: null } }
}

function finish(state: PlayingState): FinishedState {
  return { phase: 'finished', players: state.players, settings: state.settings, rounds: state.round.number }
}

/** After every turn of the round: the reveal, then the next round. */
function reduceRoundOver(state: PlayingState, action: GameAction): GameState {
  const { round } = state
  switch (action.type) {
    case 'reveal': {
      if (round.result) return state
      const hits = round.turns.flatMap(({ playerId, circle }) =>
        circle && circleHits(circle, action.geometry) ? [{ playerId, radiusKm: circle.radiusKm }] : [],
      )
      const winnerIds = roundWinners(hits)
      const players = state.players.map((p) => (winnerIds.includes(p.id) ? { ...p, score: p.score + 1 } : p))
      const gameOver =
        gameWinner(players, state.settings.targetScore) !== null ||
        // Every place has been played: the game ends with the standings as they are.
        drawPlace(action.pool, state.settings.categories, state.usedPlaceIds, state.rng) === null
      return {
        ...state,
        players,
        round: { ...round, result: { hitIds: hits.map((h) => h.playerId), winnerIds, gameOver } },
      }
    }

    case 'nextRound': {
      if (!round.result) return state
      const draw = round.result.gameOver
        ? null
        : drawPlace(action.pool, state.settings.categories, state.usedPlaceIds, state.rng)
      if (!draw) return finish(state)
      return {
        ...state,
        rng: draw.rng,
        usedPlaceIds: [...state.usedPlaceIds, draw.placeId],
        round: newRound(round.number + 1, draw.placeId, draw.category),
      }
    }

    default:
      return state
  }
}

function reducePlaying(state: PlayingState, action: GameAction): GameState {
  const player = playerOnTurn(state)
  if (!player) return reduceRoundOver(state, action)
  if (action.type === 'startTurn') {
    if (state.round.turnStartedAt !== null) return state
    return { ...state, round: { ...state.round, turnStartedAt: action.now } }
  }
  // Everything else needs a running turn.
  if (state.round.turnStartedAt === null) return state

  const { draft } = state.round

  switch (action.type) {
    case 'setDraft': {
      const circle = validCircle(action.circle)
      return circle ? { ...state, round: { ...state.round, draft: circle } } : state
    }

    case 'submitTurn':
      return draft ? endTurn(state, player, 'submitted', draft) : state

    case 'passTurn':
      return endTurn(state, player, 'passed', null)

    case 'timeUp': {
      // Only counts once the time is really up (and there is a timer at all).
      const deadline = turnDeadline(state)
      if (deadline === null || action.now < deadline) return state
      return draft ? endTurn(state, player, 'submitted', draft) : endTurn(state, player, 'timedOut', null)
    }

    default:
      return state
  }
}

/** The finished game's players and settings, as a setup to start again from. */
function setupOf({ players, settings }: FinishedState): SetupState {
  return { phase: 'setup', players: players.map(({ id, name, color }) => ({ id, name, color })), settings }
}

/**
 * The game's state machine. `defaultName` names new players; it comes from the UI, which owns
 * the texts, and is bound here so that actions stay plain data.
 */
export function createGameReducer(defaultName: DefaultName) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    if (action.type === 'newGame') return createSetup(defaultName)
    switch (state.phase) {
      case 'setup':
        return reduceSetup(state, action, defaultName)
      case 'playing':
        return reducePlaying(state, action)
      case 'finished':
        return action.type === 'playAgain' ? reduceSetup(setupOf(state), { ...action, type: 'start' }, defaultName) : state
    }
  }
}
