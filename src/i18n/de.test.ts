import { describe, expect, it } from 'vitest'
import { de } from './de'

const sections = de.howToPlay.sections
const allText = (s: ReturnType<typeof sections>) =>
  [...Object.values(s).flatMap((section) => section.text), s.scoring.tip].join('\n')

describe('how-to-play text', () => {
  it('names the turn time when there is a timer', () => {
    const text = allText(sections({ targetScore: 10, turnSeconds: 45 }))
    expect(text).toContain('Du hast 45 Sekunden')
    expect(text).not.toContain('kein Zeitlimit')
  })

  it('says there is no time limit when the timer is off', () => {
    const text = allText(sections({ targetScore: 10, turnSeconds: null }))
    expect(text).toContain('Es gibt kein Zeitlimit.')
    expect(text).not.toContain('Sekunden')
  })

  it('names the target score, in singular and plural', () => {
    expect(sections({ targetScore: 7, turnSeconds: 60 }).end.text[0]).toBe('Wer zuerst 7 Punkte hat, gewinnt.')
    expect(sections({ targetScore: 1, turnSeconds: 60 }).end.text[0]).toBe('Wer zuerst 1 Punkt hat, gewinnt.')
  })

  it('mentions the minimum radius and the turn buttons by their labels', () => {
    const text = allText(sections({ targetScore: 10, turnSeconds: 60 }))
    expect(text).toContain('1 km')
    expect(text).toContain(`„${de.game.submit}“`)
    expect(text).toContain(`„${de.game.pass}“`)
  })
})
