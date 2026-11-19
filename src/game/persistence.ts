import type { GameState } from './state'

export const STORAGE_KEY = 'eingekreist.game'
/**
 * Bump whenever the shape of `GameState` changes: saved games of another version are dropped
 * rather than checked field by field.
 */
const VERSION = 1

interface Stored {
  version: typeof VERSION
  state: GameState
}

const PHASES: readonly string[] = ['setup', 'playing'] satisfies GameState['phase'][]

/** The saved game, or `null` if there is none or it can't be used. Never throws. */
export function loadGame(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): GameState | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<Stored>
    return stored.version === VERSION && PHASES.includes(stored.state?.phase as string) ? stored.state! : null
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
