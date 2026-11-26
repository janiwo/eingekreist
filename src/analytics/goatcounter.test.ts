import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGameReducer, createSetup, type GameState } from '../game/state'
import { gameEvent, initAnalytics, trackEvent } from './goatcounter'

const gameReducer = createGameReducer((n) => `Spieler ${n}`)
const setup = createSetup((n) => `Spieler ${n}`)
const playing = gameReducer(gameReducer(setup, { type: 'addPlayer' }), {
  type: 'start',
  pool: { country: ['france'], city: [], water: [] },
  seed: 1,
})
const finished: GameState = { phase: 'finished', players: [], settings: setup.settings, rounds: 12 }

afterEach(() => vi.unstubAllGlobals())

describe('gameEvent', () => {
  it('reports a game start with the number of players', () => {
    expect(playing.phase).toBe('playing')
    expect(gameEvent('setup', playing)).toBe('game-started/3-players')
  })

  it('reports "play again" from the end screen as a start', () => {
    expect(gameEvent('finished', playing)).toBe('game-started/3-players')
  })

  it('reports a game end with the number of rounds', () => {
    expect(gameEvent('playing', finished)).toBe('game-finished/12-rounds')
  })

  it('ignores everything that is not a start or an end', () => {
    // Same phase, e.g. a restored game after a reload or a new round.
    expect(gameEvent('playing', playing)).toBeNull()
    expect(gameEvent('finished', finished)).toBeNull()
    expect(gameEvent('setup', setup)).toBeNull()
    // Leaving a game for a new one.
    expect(gameEvent('playing', setup)).toBeNull()
    expect(gameEvent('finished', setup)).toBeNull()
  })
})

describe('trackEvent', () => {
  it('sends an event when GoatCounter is loaded', () => {
    const count = vi.fn()
    vi.stubGlobal('window', { goatcounter: { count } })
    trackEvent('game-started/2-players')
    expect(count).toHaveBeenCalledWith({ path: 'game-started/2-players', event: true })
  })

  it('does nothing when GoatCounter is missing (blocked or not loaded yet)', () => {
    vi.stubGlobal('window', {})
    expect(() => trackEvent('game-started/2-players')).not.toThrow()
  })
})

describe('initAnalytics', () => {
  const fakeDocument = () => {
    const append = vi.fn()
    vi.stubGlobal('document', { createElement: () => ({ dataset: {} }), head: { append } })
    return append
  }

  it('loads the script on the live site', () => {
    const append = fakeDocument()
    initAnalytics(true, 'janiwo.github.io')
    expect(append).toHaveBeenCalledWith({
      async: true,
      src: 'https://gc.zgo.at/count.js',
      dataset: { goatcounter: 'https://eingekreist.goatcounter.com/count' },
    })
  })

  it('loads nothing in dev or on other hosts', () => {
    const append = fakeDocument()
    initAnalytics(false, 'janiwo.github.io')
    initAnalytics(true, 'localhost')
    expect(append).not.toHaveBeenCalled()
  })
})
