import { expect, type Page } from '@playwright/test'
import { STORAGE_KEY } from '../src/game/persistence'

export const nameInput = (page: Page, n: number) => page.getByLabel(`Name von Spieler ${n}`)
/** The radius readout. */
export const readout = (page: Page) => page.getByRole('status')

/** The persisted game state, as the app stored it. */
export const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.state, STORAGE_KEY)

/** Taps (mobile) or clicks (desktop) the middle of the viewport and waits for the circle. */
export async function tapGlobeCenter(page: Page, isMobile: boolean) {
  const { width, height } = page.viewportSize()!
  if (isMobile) await page.touchscreen.tap(width / 2, height / 2)
  else await page.mouse.click(width / 2, height / 2)
  await expect(readout(page)).toContainText('Radius:')
}

/** Loads the app (at `path`) and waits until the globe has finished rendering. */
export async function openGlobe(page: Page, path = '/') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto(path)
  await page.waitForFunction(() => window.__eingekreist?.map.loaded(), null, { timeout: 30_000 })
  return {
    expectNoErrors: () => expect(errors, errors.join('\n')).toEqual([]),
  }
}

/** Starts a game from the setup screen with its current players and settings, and the first turn. */
export async function startGame(page: Page) {
  await page.getByRole('button', { name: 'Spiel starten' }).click()
  await startTurn(page)
}

/** Taps the handover screen and waits for the turn (with the prompt) to be ready. */
export async function startTurn(page: Page, playerName?: string) {
  const handover = page.getByTestId('handover')
  if (playerName) await expect(handover).toContainText(playerName)
  await handover.click()
  await expect(page.locator('[data-testid="prompt"][data-ready="true"]')).toBeVisible()
}
