import { describe, expect, it } from 'vitest'
import { detectLocale, loadLocale, LOCALE_STORAGE_KEY, saveLocale } from './locale'

const storage = (items: Record<string, string> = {}) => ({
  getItem: (k: string) => items[k] ?? null,
  setItem: (k: string, v: string) => void (items[k] = v),
})

describe('detectLocale', () => {
  it('picks German for a browser that prefers German', () => {
    expect(detectLocale(['de'])).toBe('de')
    expect(detectLocale(['de-AT', 'en'])).toBe('de')
    expect(detectLocale(['DE-ch'])).toBe('de')
  })

  it('picks English for every other browser', () => {
    expect(detectLocale(['en-US', 'de'])).toBe('en')
    expect(detectLocale(['fr'])).toBe('en')
    expect(detectLocale(['dev'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })
})

describe('loadLocale and saveLocale', () => {
  it('prefers the saved choice over the browser language', () => {
    const s = storage()
    saveLocale('en', s)
    expect(loadLocale(s, ['de-DE'])).toBe('en')
  })

  it('falls back to the browser language without a valid saved choice', () => {
    expect(loadLocale(storage(), ['de-DE'])).toBe('de')
    expect(loadLocale(storage({ [LOCALE_STORAGE_KEY]: 'fr' }), ['de-DE'])).toBe('de')
  })

  it('never throws when the storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadLocale(blocked, ['de'])).toBe('de')
    expect(() => saveLocale('en', blocked)).not.toThrow()
  })
})
