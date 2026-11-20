import { describe, expect, it } from 'vitest'
import { gameWinner, isSuddenDeath, ranking, roundWinners } from './scoring'

const hit = (playerId: string, radiusKm: number) => ({ playerId, radiusKm })
const scores = (...s: number[]) => s.map((score, i) => ({ id: `p${i + 1}`, score }))

describe('roundWinners', () => {
  it('the smallest hitting circle wins', () => {
    expect(roundWinners([hit('a', 300), hit('b', 50)])).toEqual(['b'])
  })

  it('all players tied on the smallest radius win', () => {
    expect(roundWinners([hit('a', 40), hit('b', 40), hit('c', 41)])).toEqual(['a', 'b'])
  })

  it('nobody wins if nobody hit', () => {
    expect(roundWinners([])).toEqual([])
  })
})

describe('gameWinner', () => {
  it('nobody wins below the target score', () => {
    expect(gameWinner(scores(2, 1, 0), 3)).toBeNull()
  })

  it('the single leader at the target score wins', () => {
    expect(gameWinner(scores(1, 3, 2), 3)).toEqual({ id: 'p2', score: 3 })
  })

  it('several players at the target score: sudden death, no winner yet', () => {
    const tied = scores(3, 3, 1)
    expect(gameWinner(tied, 3)).toBeNull()
    expect(isSuddenDeath(tied, 3)).toBe(true)
  })

  it('sudden death ends once one player leads alone', () => {
    expect(gameWinner(scores(4, 3, 1), 3)).toEqual({ id: 'p1', score: 4 })
    expect(isSuddenDeath(scores(4, 3, 1), 3)).toBe(false)
    // Still tied on top (e.g. both scored again): sudden death goes on.
    expect(gameWinner(scores(4, 4, 3), 3)).toBeNull()
  })

  it('a tie below the target is no sudden death', () => {
    expect(isSuddenDeath(scores(2, 2), 3)).toBe(false)
  })
})

describe('ranking', () => {
  it('sorts by score and shares ranks on ties', () => {
    expect(ranking(scores(1, 3, 3, 0)).map(({ player, rank }) => [player.id, rank])).toEqual([
      ['p2', 1],
      ['p3', 1],
      ['p1', 3],
      ['p4', 4],
    ])
  })
})
