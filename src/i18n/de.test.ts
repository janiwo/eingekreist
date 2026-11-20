import { describe, expect, it } from 'vitest'
import { de } from './de'

const t = de.howToPlay

describe('how-to-play text', () => {
  it('names the turn time, or says there is no time limit', () => {
    expect(t.turnTime(45)).toBe('Du hast 45 Sekunden. Läuft die Zeit ab, wird dein Kreis automatisch abgegeben.')
    expect(t.turnTime(null)).toBe('Es gibt kein Zeitlimit.')
  })

  it('names the target score, in singular and plural', () => {
    expect(t.winAt(7)).toBe('Wer zuerst 7 Punkte hat, gewinnt.')
    expect(t.winAt(1)).toBe('Wer zuerst 1 Punkt hat, gewinnt.')
  })

  it('mentions the minimum radius and the turn buttons by their labels', () => {
    expect(t.tip).toContain('1 km')
    expect(t.round.text.join(' ')).toContain(`„${de.game.submit}“`)
    expect(t.round.text.join(' ')).toContain(`„${de.game.pass}“`)
  })
})
