import { describe, expect, it } from 'vitest'
import type { PlacePool } from './draw'
import { loadGame, saveGame, STORAGE_KEY } from './persistence'
import {
  createGameReducer,
  createSetup,
  MAX_TARGET_SCORE,
  PLAYER_COLORS,
  setupProblems,
  type GameAction,
  type GameState,
  type PlayingState,
  type SetupState,
} from './state'
import { CATEGORIES, MAX_PLAYERS, MIN_PLAYERS } from './types'

const defaultName = (n: number) => `Spieler ${n}`
const gameReducer = createGameReducer(defaultName)
const pool: PlacePool = { country: ['france', 'japan'], city: ['paris'], water: ['nile'] }

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state)
const setup = () => createSetup(defaultName)
const asSetup = (s: GameState) => {
  expect(s.phase).toBe('setup')
  return s as SetupState
}
const add: GameAction = { type: 'addPlayer' }

describe('setup', () => {
  it('starts with two players, distinct colors and the default settings', () => {
    const s = setup()
    expect(s.players).toEqual([
      { id: 'p1', name: 'Spieler 1', color: PLAYER_COLORS[0] },
      { id: 'p2', name: 'Spieler 2', color: PLAYER_COLORS[1] },
    ])
    expect(s.settings).toEqual({ targetScore: 10, turnSeconds: 60, showBorders: true, categories: [...CATEGORIES] })
  })

  it('allows 2 to 8 players', () => {
    let s: GameState = setup()
    for (let i = 0; i < 10; i++) s = gameReducer(s, add)
    expect(asSetup(s).players).toHaveLength(MAX_PLAYERS)
    expect(new Set(asSetup(s).players.map((p) => p.color)).size).toBe(MAX_PLAYERS)
    for (const p of asSetup(s).players) s = gameReducer(s, { type: 'removePlayer', id: p.id })
    expect(asSetup(s).players).toHaveLength(MIN_PLAYERS)
  })

  it('reuses the lowest free number and color for a new player', () => {
    const s = asSetup(run(setup(), add, { type: 'removePlayer', id: 'p1' }, add))
    expect(s.players.map((p) => [p.id, p.name, p.color])).toEqual([
      ['p2', 'Spieler 2', PLAYER_COLORS[1]],
      ['p3', 'Spieler 3', PLAYER_COLORS[2]],
      ['p1', 'Spieler 1', PLAYER_COLORS[0]],
    ])
  })

  it('renames a player', () => {
    const s = asSetup(run(setup(), { type: 'renamePlayer', id: 'p2', name: 'Anna' }))
    expect(s.players[1].name).toBe('Anna')
  })

  it('swaps colors when picking one that is taken', () => {
    const s = asSetup(run(setup(), { type: 'setPlayerColor', id: 'p1', color: PLAYER_COLORS[1] }))
    expect(s.players.map((p) => p.color)).toEqual([PLAYER_COLORS[1], PLAYER_COLORS[0]])
  })

  it('ignores colors outside the palette', () => {
    const s = setup()
    expect(run(s, { type: 'setPlayerColor', id: 'p1', color: '#123456' })).toBe(s)
  })

  it('reports empty and duplicate names', () => {
    expect(setupProblems(setup())).toEqual([])
    expect(setupProblems(asSetup(run(setup(), { type: 'renamePlayer', id: 'p1', name: '  ' })))).toEqual([
      'emptyName',
    ])
    expect(setupProblems(asSetup(run(setup(), { type: 'renamePlayer', id: 'p1', name: 'spieler 2 ' })))).toEqual([
      'duplicateName',
    ])
  })

  it('clamps the target score and validates the timer', () => {
    const upd = (settings: Extract<GameAction, { type: 'updateSettings' }>['settings']) =>
      asSetup(run(setup(), { type: 'updateSettings', settings })).settings
    expect(upd({ targetScore: 0 }).targetScore).toBe(1)
    expect(upd({ targetScore: 1000 }).targetScore).toBe(MAX_TARGET_SCORE)
    expect(upd({ targetScore: Number.NaN }).targetScore).toBe(1)
    expect(upd({ targetScore: 5 }).targetScore).toBe(5)
    expect(upd({ turnSeconds: null }).turnSeconds).toBeNull()
    expect(upd({ turnSeconds: 90 }).turnSeconds).toBe(90)
    expect(upd({ turnSeconds: -5 }).turnSeconds).toBe(60)
    expect(upd({ showBorders: false }).showBorders).toBe(false)
  })

  it('keeps at least one category active, in canonical order', () => {
    let s: GameState = setup()
    for (const category of CATEGORIES) s = gameReducer(s, { type: 'toggleCategory', category })
    expect(asSetup(s).settings.categories).toEqual(['landmark'])
    s = run(s, { type: 'toggleCategory', category: 'city' })
    expect(asSetup(s).settings.categories).toEqual(['city', 'landmark'])
  })
})

describe('start', () => {
  const start: GameAction = { type: 'start', pool, seed: 1234 }

  it('starts round 1 with a drawn place and zero scores', () => {
    const s = run(setup(), { type: 'renamePlayer', id: 'p1', name: ' Anna ' }, start) as PlayingState
    expect(s.phase).toBe('playing')
    expect(s.players.map((p) => [p.name, p.score])).toEqual([
      ['Anna', 0],
      ['Spieler 2', 0],
    ])
    expect(s.round.number).toBe(1)
    expect(pool[s.round.category]).toContain(s.round.placeId)
    expect(s.usedPlaceIds).toEqual([s.round.placeId])
  })

  it('is deterministic for a seed', () => {
    expect(run(setup(), start)).toEqual(run(setup(), start))
  })

  it('only draws from the active categories', () => {
    const s = run(
      setup(),
      ...CATEGORIES.filter((c) => c !== 'water').map((category): GameAction => ({ type: 'toggleCategory', category })),
      start,
    ) as PlayingState
    expect(s.round.placeId).toBe('nile')
  })

  it('does not start while the setup has problems or no place can be drawn', () => {
    const bad = run(setup(), { type: 'renamePlayer', id: 'p1', name: '' })
    expect(run(bad, start)).toBe(bad)
    const s = setup()
    expect(run(s, { type: 'start', pool: {}, seed: 1 })).toBe(s)
  })

  it('ignores setup actions while playing', () => {
    const playing = run(setup(), start)
    expect(run(playing, add, { type: 'toggleCategory', category: 'city' }, start)).toBe(playing)
  })

  it('"new game" returns to a fresh setup', () => {
    expect(run(setup(), add, start, { type: 'newGame' })).toEqual(setup())
  })
})

describe('persistence', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
  }

  it('round-trips setup and playing states', () => {
    const storage = memory()
    for (const state of [setup(), run(setup(), { type: 'start', pool, seed: 5 })]) {
      saveGame(state, storage)
      expect(loadGame(storage)).toEqual(state)
    }
  })

  it('returns null for missing, corrupt or outdated entries', () => {
    const storage = memory()
    expect(loadGame(storage)).toBeNull()
    for (const raw of ['{', '"x"', '{"version":0,"state":{}}', '{"version":1,"state":{"phase":"bogus"}}', '{"version":1}']) {
      storage.setItem(STORAGE_KEY, raw)
      expect(loadGame(storage)).toBeNull()
    }
  })

  it('swallows storage errors', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(loadGame(broken)).toBeNull()
    expect(() => saveGame(setup(), broken)).not.toThrow()
  })
})
