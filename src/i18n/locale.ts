/** The languages of the UI and the place names. The first one is the fallback of the place data. */
export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** A text in every UI language, e.g. a place name. */
export type Localized = Record<Locale, string>

/**
 * How the language switch shows each language: in that language itself, so a player who can't
 * read the current one still finds theirs.
 */
export const LANGUAGE_NAMES: Record<Locale, { code: string; name: string }> = {
  de: { code: 'DE', name: 'Deutsch' },
  en: { code: 'EN', name: 'English' },
}

export const LOCALE_STORAGE_KEY = 'eingekreist.locale'

const isLocale = (s: unknown): s is Locale => LOCALES.includes(s as Locale)

/** German for a browser that prefers German (`de`, `de-AT` …), English for everyone else. */
export function detectLocale(languages: readonly string[]): Locale {
  return languages[0]?.toLowerCase().split('-')[0] === 'de' ? 'de' : 'en'
}

/** The language the player chose earlier, else the browser's. Never throws. */
export function loadLocale(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
  languages: readonly string[] = globalThis.navigator?.languages ?? [],
): Locale {
  try {
    const saved = storage?.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    // Storage blocked (private mode, settings): fall back to the browser language.
  }
  return detectLocale(languages)
}

/** Remembers the player's choice. Never throws. */
export function saveLocale(locale: Locale, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Not remembered; the browser language decides next time.
  }
}
