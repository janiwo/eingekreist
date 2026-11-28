import { useI18n } from '../i18n/context'
import { LANGUAGE_NAMES, LOCALES } from '../i18n/locale'

/** "DE | EN": switches the UI language. Each option names its language in that language. */
export function LanguageSwitch() {
  const { t, locale, setLocale } = useI18n()
  return (
    <div className="language-switch" role="group" aria-label={t.language}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          className="language-switch__option"
          aria-pressed={l === locale}
          aria-label={LANGUAGE_NAMES[l].name}
          title={LANGUAGE_NAMES[l].name}
          onClick={() => setLocale(l)}
        >
          {LANGUAGE_NAMES[l].code}
        </button>
      ))}
    </div>
  )
}
