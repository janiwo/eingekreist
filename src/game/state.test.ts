import type { Polygon } from 'geojson'
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
  type FinishedState,
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
  const place = (c: Circle = circle): GameAction => ({ type: 'setDraft', circle: c })
  const submit: GameAction = { type: 'submitTurn' }
  const timeUp = (now: number): GameAction => ({ type: 'timeUp', now })

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
        place(),
        submit,
        startTurn(T0 + 5000),
        { type: 'passTurn' },
        startTurn(T0 + 9000),
        timeUp(T0 + 69_000),
      ),
    )
    expect(s.round.turns).toEqual([
      { playerId: 'p1', outcome: 'submitted', circle },
      { playerId: 'p2', outcome: 'passed', circle: null },
      { playerId: 'p3', outcome: 'timedOut', circle: null },
    ])
    expect(s.round.turnStartedAt).toBeNull()
    expect(s.round.draft).toBeNull()
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
    const s = playing(run(game(30), startTurn(), place(), timeUp(T0 + 30_000)))
    expect(s.round.turns).toEqual([{ playerId: 'p1', outcome: 'submitted', circle }])
    expect(s.round.draft).toBeNull() // no trace for the next player
  })

  it('ignores a time-up before the time is up or without a timer', () => {
    const early = playing(run(game(30), startTurn()))
    expect(run(early, timeUp(T0 + 29_999))).toBe(early)
    const untimed = playing(run(game(null), startTurn()))
    expect(run(untimed, timeUp(T0 + 1e9))).toBe(untimed)
  })

  it('ignores turn actions on the handover screen', () => {
    const s = game()
    expect(run(s, place(), submit, { type: 'passTurn' }, timeUp(T0 + 1e9))).toBe(s)
  })

  it('cannot submit without a circle', () => {
    const s = playing(run(game(), startTurn()))
    expect(run(s, submit)).toBe(s)
  })

  it('rejects invalid circles and enforces the minimum radius', () => {
    const s = playing(run(game(), startTurn()))
    expect(run(s, place({ center: [0, 95], radiusKm: 10 }))).toBe(s)
    expect(run(s, place({ center: [Number.NaN, 0], radiusKm: 10 }))).toBe(s)
    expect(playing(run(s, place({ center: [0, 0], radiusKm: 0.2 }))).round.draft?.radiusKm).toBe(1)
    expect(playing(run(s, place({ center: [0, 0], radiusKm: 1e6 }))).round.draft?.radiusKm).toBe(20_000)
  })

  it('ignores turn actions once every player has had a turn', () => {
    let s: GameState = game()
    for (let i = 0; i < 3; i++) s = run(s, startTurn(), { type: 'passTurn' })
    expect(run(s, startTurn(), { type: 'passTurn' })).toBe(s)
  })

  it('round-trips a game mid-turn through persistence', () => {
    const storage = memory()
    const s = run(game(), startTurn(), place(), submit, startTurn(T0 + 1), place({ center: [0, 0], radiusKm: 5 }))
    saveGame(s, storage)
    expect(loadGame(storage)).toEqual(s)
  })
})

describe('reveal and end of game', () => {
  /** A square around (0, 0), about 220 km across. */
  const geometry: Polygon = {
    type: 'Polygon',
    coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]],
  }
  const places: PlacePool = { country: ['a', 'b', 'c', 'd', 'e', 'f'] }
  const reveal: GameAction = { type: 'reveal', geometry, pool: places }
  const next: GameAction = { type: 'nextRound', pool: places }
  const hit = (radiusKm: number): Circle => ({ center: [0, 0], radiusKm })
  const miss = (radiusKm: number): Circle => ({ center: [20, 0], radiusKm })
  /** Plays one round: a circle submits, `null` passes. */
  const round = (...circles: (Circle | null)[]): GameAction[] =>
    circles.flatMap((c) => [
      { type: 'startTurn', now: 0 } as GameAction,
      ...(c ? [{ type: 'setDraft', circle: c } as GameAction, { type: 'submitTurn' } as GameAction] : [{ type: 'passTurn' } as GameAction]),
    ])
  /** A started game with two players (three with `three`) and the given target score. */
  const game = (targetScore: number, three = false) =>
    run(
      setup(),
      ...(three ? [add] : []),
      { type: 'updateSettings', settings: { targetScore } },
      // More places than rounds in these tests.
      { type: 'start', pool: places, seed: 3 },
    ) as PlayingState
  const scoresOf = (s: GameState) => (s as PlayingState | FinishedState).players.map((p) => p.score)

  it('scores the round: the smallest hit gets the point', () => {
    const s = run(game(5, true), ...round(hit(50), miss(10), hit(80)), reveal) as PlayingState
    expect(s.round.result).toEqual({ hitIds: ['p1', 'p3'], winnerIds: ['p1'], gameOver: false })
    expect(scoresOf(s)).toEqual([1, 0, 0])
  })

  it('gives every tied player a point', () => {
    const s = run(game(5, true), ...round(hit(50), hit(50), hit(51)), reveal)
    expect(scoresOf(s)).toEqual([1, 1, 0])
  })

  it('gives nobody a point if nobody hit', () => {
    const s = run(game(5), ...round(miss(10), null), reveal) as PlayingState
    expect(s.round.result).toEqual({ hitIds: [], winnerIds: [], gameOver: false })
    expect(scoresOf(s)).toEqual([0, 0])
  })

  it('counts a touch of the edge as a hit', () => {
    // The square's edge is ~111 km from the center at (0, 2).
    const s = run(game(5), ...round({ center: [0, 2], radiusKm: 112 }, { center: [0, 2], radiusKm: 100 }), reveal)
    expect((s as PlayingState).round.result?.hitIds).toEqual(['p1'])
  })

  it('scores a round only once, and only after every turn', () => {
    const midRound = run(game(5), ...round(hit(5)))
    expect(run(midRound, reveal)).toBe(midRound)
    const revealed = run(midRound, ...round(null), reveal)
    expect(run(revealed, reveal)).toBe(revealed)
  })

  it('starts the next round with a new place after the reveal', () => {
    const before = run(game(5), ...round(hit(5), null))
    expect(run(before, next)).toBe(before) // not revealed yet
    const s = run(before, reveal, next) as PlayingState
    expect(s.round).toMatchObject({ number: 2, turns: [], result: null })
    expect(s.usedPlaceIds).toHaveLength(2)
    expect(new Set(s.usedPlaceIds).size).toBe(2)
    expect(s.usedPlaceIds[1]).toBe(s.round.placeId)
    expect(scoresOf(s)).toEqual([1, 0])
  })

  it('ends the game once a player reaches the target score alone', () => {
    const s = run(game(2), ...round(hit(5), null), reveal, next, ...round(hit(5), hit(9)), reveal)
    expect(s.phase).toBe('playing') // the reveal comes first
    expect((s as PlayingState).round.result?.gameOver).toBe(true)
    const done = run(s, next)
    expect(done).toEqual({ phase: 'finished', players: expect.any(Array), settings: expect.any(Object), rounds: 2 })
    expect(scoresOf(done)).toEqual([2, 0])
  })

  /** IDs of the players who play the round, and who is on turn. */
  const roundPlayers = (s: GameState) => (s as PlayingState).round.playerIds
  const onTurn = (s: GameState) => playerOnTurn(s as PlayingState)?.id

  it('sudden death: only the players tied on top play on', () => {
    // Target 1: p1 and p2 hit with the same radius, p3 passes → 1 : 1 : 0.
    let s = run(game(1, true), ...round(hit(5), hit(5), null), reveal)
    expect((s as PlayingState).round.result?.gameOver).toBe(false)
    s = run(s, next)
    expect(roundPlayers(s)).toEqual(['p1', 'p2'])
    expect(onTurn(s)).toBe('p1')
    // Two turns end the round: p3 is out and never on turn.
    s = run(s, ...round(miss(5), null))
    expect(onTurn(s)).toBeUndefined()
    s = run(s, reveal) as PlayingState
    expect(scoresOf(s)).toEqual([1, 1, 0])
    // Nobody hit: still tied, the same two play on.
    s = run(s, next, ...round(hit(20), hit(10)), reveal)
    expect(scoresOf(s)).toEqual([1, 2, 0])
    expect(run(s, next).phase).toBe('finished')
  })

  it('sudden death: a player who falls behind is out, the rest play on', () => {
    // Four players, target 1: all four tie in round 1.
    let s = run(setup(), add, add, { type: 'updateSettings', settings: { targetScore: 1 } }, { type: 'start', pool: places, seed: 3 })
    s = run(s, ...round(hit(5), hit(5), hit(5), hit(5)), reveal, next)
    expect(roundPlayers(s)).toEqual(['p1', 'p2', 'p3', 'p4'])
    // Three tie again, p2 misses: p2 is out.
    s = run(s, ...round(hit(5), miss(5), hit(5), hit(5)), reveal, next)
    expect(scoresOf(s)).toEqual([2, 1, 2, 2])
    expect(roundPlayers(s)).toEqual(['p1', 'p3', 'p4'])
    // Two tie, p4 passes: p4 is out too.
    s = run(s, ...round(hit(5), hit(5), null), reveal, next)
    expect(roundPlayers(s)).toEqual(['p1', 'p3'])
    // p3 wins alone.
    s = run(s, ...round(hit(9), hit(8)), reveal, next)
    expect(s.phase).toBe('finished')
    expect(scoresOf(s)).toEqual([3, 1, 4, 2])
  })

  it('everyone plays while nobody has reached the target', () => {
    const s = run(game(3, true), ...round(hit(5), hit(5), null), reveal, next)
    expect(roundPlayers(s)).toEqual(['p1', 'p2', 'p3'])
  })

  it('ends the game when the places run out', () => {
    const single: PlacePool = { country: ['only'] }
    const s = run(
      setup(),
      { type: 'start', pool: single, seed: 1 },
      ...round(null, null),
      { type: 'reveal', geometry, pool: single },
    )
    expect((s as PlayingState).round.result?.gameOver).toBe(true)
    expect(run(s, { type: 'nextRound', pool: single })).toMatchObject({ phase: 'finished', rounds: 1 })
  })

  it('"play again" starts a new game with the same players and settings', () => {
    const done = run(game(1), ...round(hit(5), null), reveal, next) as FinishedState
    const again = run(done, { type: 'playAgain', pool, seed: 9 }) as PlayingState
    expect(again.phase).toBe('playing')
    expect(again.players).toEqual(done.players.map((p) => ({ ...p, score: 0 })))
    expect(again.settings).toEqual(done.settings)
    expect(again.round.number).toBe(1)
    expect(run(done, next, reveal)).toBe(done)
  })

  it('round-trips a revealed round and a finished game through persistence', () => {
    const storage = memory()
    const revealed = run(game(1), ...round(hit(5), null), reveal)
    for (const state of [revealed, run(revealed, next)]) {
      saveGame(state, storage)
      expect(loadGame(storage)).toEqual(state)
    }
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
    for (const raw of ['{', '"x"', '{"version":0,"state":{}}', '{"version":2,"state":{"phase":"setup"}}', '{"version":3,"state":{"phase":"bogus"}}', '{"version":3}']) {
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
