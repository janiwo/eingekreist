import { describe, expect, it } from 'vitest'
import { STRINGS } from './context'
import { de } from './de'
import { en } from './en'

/** Every key path of a string table; functions and arrays count as leaves. */
function shape(value: unknown, path = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [`${path}:${typeof value === 'function' ? `fn${value.length}` : Array.isArray(value) ? `array${value.length}` : typeof value}`]
  }
  return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
}

describe('string tables', () => {
  it('have the same keys, functions and list lengths in every language', () => {
    for (const strings of Object.values(STRINGS)) expect(shape(strings)).toEqual(shape(de))
  })
})

describe('how-to-play text', () => {
  it('mentions the minimum radius and the submit button by its label', () => {
    expect(de.howToPlay.tip).toContain('1 km')
    expect(de.howToPlay.round.text.join(' ')).toContain(`„${de.game.submit}“`)
    expect(en.howToPlay.tip).toContain('1 km')
    expect(en.howToPlay.round.text.join(' ')).toContain(`“${en.game.submit}”`)
  })
})

describe('English grammar', () => {
  it('ranks with ordinals and counts in singular and plural', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(en.end.rank)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd',
    ])
    expect(en.end.points(1)).toBe('1 point')
    expect(en.end.rounds(2)).toBe('after 2 rounds')
    expect(en.reveal.winners(['Anna', 'Ben', 'Cem'])).toBe('🏆 Anna, Ben, and Cem each score a point')
    expect(en.formatKm(1234.5)).toBe('1,234.5 km')
    expect(de.formatKm(1234.5)).toBe('1.234,5 km')
  })
})
