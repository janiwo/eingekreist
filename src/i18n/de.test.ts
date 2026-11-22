import { describe, expect, it } from 'vitest'
import { de } from './de'

const t = de.howToPlay

describe('how-to-play text', () => {
  it('mentions the minimum radius and the submit button by its label', () => {
    expect(t.tip).toContain('1 km')
    expect(t.round.text.join(' ')).toContain(`„${de.game.submit}“`)
  })
})
