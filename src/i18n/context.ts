import { createContext, useContext } from 'react'
import { de, type Strings } from './de'
import { en } from './en'
import type { Locale } from './locale'

export const STRINGS: Record<Locale, Strings> = { de, en }

export interface I18n {
  locale: Locale
  /** The UI strings of `locale`. */
  t: Strings
  setLocale: (locale: Locale) => void
}

export const I18nContext = createContext<I18n>({ locale: 'de', t: de, setLocale: () => {} })

/** The current language, its strings, and a way to change it (see `I18nProvider`). */
export const useI18n = () => useContext(I18nContext)
