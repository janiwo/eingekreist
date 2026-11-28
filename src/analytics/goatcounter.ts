import type { GameState } from '../game/state'
import type { Locale } from '../i18n/locale'

/**
 * Privacy-friendly visitor statistics via GoatCounter (no cookies, no device storage).
 * Page views are counted by GoatCounter's script itself; game events go through `trackEvent`.
 * Dashboard: https://eingekreist.goatcounter.com/
 */
const ENDPOINT = 'https://eingekreist.goatcounter.com/count'
const SCRIPT_URL = 'https://gc.zgo.at/count.js'
/** Only the live site counts: never dev, e2e tests, screenshots or `npm run preview`. */
const LIVE_HOST = 'janiwo.github.io'

interface GoatCounter {
  count(vars: { path: string; title?: string; event?: boolean }): void
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

/** Loads GoatCounter's script on the live site; does nothing anywhere else. */
export function initAnalytics(isProd = import.meta.env.PROD, host = location.hostname) {
  if (!isProd || host !== LIVE_HOST) return
  const script = document.createElement('script')
  script.async = true
  script.src = SCRIPT_URL
  script.dataset.goatcounter = ENDPOINT
  document.head.append(script)
}

/** Counts an event. A no-op if the script isn't loaded (other hosts, ad blockers, still loading). */
export function trackEvent(path: string) {
  window.goatcounter?.count({ path, event: true })
}

/**
 * The event for a change of game phase, or `null`, ending in the UI language. Only transitions
 * count, so restoring a saved game on reload sends nothing.
 */
export function gameEvent(prev: GameState['phase'], next: GameState, locale: Locale): string | null {
  if (prev !== 'playing' && next.phase === 'playing') return `game-started/${next.players.length}-players/${locale}`
  if (prev === 'playing' && next.phase === 'finished') return `game-finished/${next.rounds}-rounds/${locale}`
  return null
}
