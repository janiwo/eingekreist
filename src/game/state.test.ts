import { describe, expect, it } from 'vitest'
import type { PlacePool } from './draw'
import { loadGame, saveGame, STORAGE_KEY } from './persistence'
import {
  createGameReducer,
  createSetup,
  MAX_TARGET_SCORE,
  PLAYER_COLORS,
  playerOnTurn,
  setupProblems,
  type GameAction,
  type GameState,
  type PlayingState,
  type SetupState,
} from './state'
import { CATEGORIES, MAX_PLAYERS, MIN_PLAYERS, type Circle } from './types'

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
/** In-memory stand-in for localStorage. */
const memory = () => {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

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

  it('never gives a new player a name that is taken', () => {
    const s = asSetup(run(setup(), { type: 'renamePlayer', id: 'p2', name: 'spieler 3' }, add))
    expect(s.players[2]).toMatchObject({ id: 'p4', name: 'Spieler 4' })
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

describe('turns', () => {
  const T0 = 1_000_000
  const circle: Circle = { center: [2.35, 48.86], radiusKm: 120 }
  /** A started three-player game (60 s timer unless given). */
  const game = (turnSeconds: number | null = 60) =>
    run(
      setup(),
      add,
      { type: 'updateSettings', settings: { turnSeconds } },
      { type: 'start', pool, seed: 7 },
    ) as PlayingState
  const playing = (s: GameState) => {
    expect(s.phase).toBe('playing')
    return s as PlayingState
  }
  const startTurn = (now = T0): GameAction => ({ type: 'startTurn', now })

  it('starts each round on the handover screen of the first player', () => {
    const s = game()
    expect(s.round.turns).toEqual([])
    expect(s.round.turnStartedAt).toBeNull()
    expect(playerOnTurn(s)?.id).toBe('p1')
  })

  it('plays a round: submit, pass, timeout', () => {
    const s = playing(
      run(
        game(),
        startTurn(),
        { type: 'submitTurn', circle },
        startTurn(T0 + 5000),
        { type: 'passTurn' },
        startTurn(T0 + 9000),
        { type: 'timeUp', circle: null, now: T0 + 69_000 },
      ),
    )
    expect(s.round.turns).toEqual([
      { playerId: 'p1', outcome: 'submitted', circle },
      { playerId: 'p2', outcome: 'passed', circle: null },
      { playerId: 'p3', outcome: 'timedOut', circle: null },
    ])
    expect(s.round.turnStartedAt).toBeNull()
    expect(playerOnTurn(s)).toBeNull()
  })

  it('records the start time and returns to the handover after a turn', () => {
    const s = playing(run(game(), startTurn()))
    expect(s.round.turnStartedAt).toBe(T0)
    expect(run(s, startTurn(T0 + 1))).toBe(s) // already started
    const next = playing(run(s, { type: 'passTurn' }))
    expect(next.round.turnStartedAt).toBeNull()
    expect(playerOnTurn(next)?.id).toBe('p2')
  })

  it('submits a placed circle automatically when time runs out', () => {
    const s = playing(run(game(30), startTurn(), { type: 'timeUp', circle, now: T0 + 30_000 }))
    expect(s.round.turns).toEqual([{ playerId: 'p1', outcome: 'submitted', circle }])
  })

  it('ignores a time-up before the time is up or without a timer', () => {
    const early = playing(run(game(30), startTurn()))
    expect(run(early, { type: 'timeUp', circle, now: T0 + 29_999 })).toBe(early)
    const untimed = playing(run(game(null), startTurn()))
    expect(run(untimed, { type: 'timeUp', circle, now: T0 + 1e9 })).toBe(untimed)
  })

  it('ignores turn actions on the handover screen', () => {
    const s = game()
    expect(run(s, { type: 'submitTurn', circle }, { type: 'passTurn' }, { type: 'timeUp', circle, now: T0 + 1e9 })).toBe(s)
  })

  it('rejects invalid circles and enforces the minimum radius', () => {
    const s = playing(run(game(), startTurn()))
    expect(run(s, { type: 'submitTurn', circle: { center: [0, 95], radiusKm: 10 } })).toBe(s)
    expect(run(s, { type: 'submitTurn', circle: { center: [Number.NaN, 0], radiusKm: 10 } })).toBe(s)
    const tiny = playing(run(s, { type: 'submitTurn', circle: { center: [0, 0], radiusKm: 0.2 } }))
    expect(tiny.round.turns[0].circle?.radiusKm).toBe(1)
    const huge = playing(run(s, { type: 'submitTurn', circle: { center: [0, 0], radiusKm: 1e6 } }))
    expect(huge.round.turns[0].circle?.radiusKm).toBe(20_000)
  })

  it('ignores turn actions once every player has had a turn', () => {
    let s: GameState = game()
    for (let i = 0; i < 3; i++) s = run(s, startTurn(), { type: 'passTurn' })
    expect(run(s, startTurn(), { type: 'passTurn' })).toBe(s)
  })

  it('round-trips a game mid-turn through persistence', () => {
    const storage = memory()
    const s = run(game(), startTurn(), { type: 'submitTurn', circle }, startTurn(T0 + 1))
    saveGame(s, storage)
    expect(loadGame(storage)).toEqual(s)
  })
})

describe('persistence', () => {
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
    for (const raw of ['{', '"x"', '{"version":0,"state":{}}', '{"version":1,"state":{"phase":"setup"}}', '{"version":2,"state":{"phase":"bogus"}}', '{"version":2}']) {
      storage.setItem(STORAGE_KEY, raw)
      expect(loadGame(storage)).toBeNull()
    }
  })

  it('drops saved games with unknown categories', () => {
    const storage = memory()
    const playing = run(setup(), { type: 'start', pool, seed: 5 }) as PlayingState
    saveGame({ ...playing, round: { ...playing.round, category: 'province' as never } }, storage)
    expect(loadGame(storage)).toBeNull()
    saveGame({ ...setup(), settings: { ...setup().settings, categories: [] } }, storage)
    expect(loadGame(storage)).toBeNull()
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
