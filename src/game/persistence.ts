import type { GameState } from './state'
import { CATEGORIES } from './types'

export const STORAGE_KEY = 'eingekreist.game'
const VERSION = 1

interface Stored {
  version: typeof VERSION
  state: GameState
}

/** Minimal shape check, so a stale or hand-edited entry can't crash the app. */
function isGameState(s: unknown): s is GameState {
  if (typeof s !== 'object' || s === null) return false
  const g = s as Partial<GameState>
  const settingsOk =
    typeof g.settings === 'object' &&
    g.settings !== null &&
    typeof g.settings.targetScore === 'number' &&
    (g.settings.turnSeconds === null || typeof g.settings.turnSeconds === 'number') &&
    typeof g.settings.showBorders === 'boolean' &&
    Array.isArray(g.settings.categories) &&
    g.settings.categories.length > 0 &&
    g.settings.categories.every((c) => CATEGORIES.includes(c))
  const playersOk =
    Array.isArray(g.players) &&
    g.players.every((p) => typeof p?.id === 'string' && typeof p.name === 'string' && typeof p.color === 'string')
  if (!settingsOk || !playersOk) return false
  if (g.phase === 'setup') return true
  if (g.phase !== 'playing') return false
  const p = g as Partial<Extract<GameState, { phase: 'playing' }>>
  return (
    typeof p.rng === 'number' &&
    Array.isArray(p.usedPlaceIds) &&
    typeof p.round?.placeId === 'string' &&
    typeof p.round.number === 'number' &&
    CATEGORIES.includes(p.round.category) &&
    p.players!.every((pl) => typeof pl.score === 'number')
  )
}

/** The saved game, or `null` if there is none or it can't be used. Never throws. */
export function loadGame(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): GameState | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<Stored>
    return stored.version === VERSION && isGameState(stored.state) ? stored.state : null
  } catch {
    return null
  }
}

/** Saves the game; failures (private mode, quota) are ignored, the game just won't survive a reload. */
export function saveGame(state: GameState, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state } satisfies Stored))
  } catch {
    // ignore
  }
}
