import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, STRINGS } from './context'
import { loadLocale, saveLocale, type Locale } from './locale'

/** Holds the UI language: the saved choice, else the browser's. Keeps `<html lang>` in step. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = loadLocale()
    // Right away, not in an effect: assistive tech and translators read it from the first render.
    document.documentElement.lang = initial
    return initial
  })

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next)
    setLocaleState(next)
  }, [])

  const value = useMemo(() => ({ locale, t: STRINGS[locale], setLocale }), [locale, setLocale])
  return <I18nContext value={value}>{children}</I18nContext>
}
