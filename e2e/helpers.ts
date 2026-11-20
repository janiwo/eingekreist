import { expect, type Page } from '@playwright/test'
import { STORAGE_KEY } from '../src/game/persistence'
import type { Circle } from '../src/game/types'
import { MAX_RADIUS_KM } from '../src/geo/circle'

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

/** Hits every place in the dataset (checked by a unit test in hitTest.test.ts). */
export const HIT: Circle = { center: [0, 0], radiusKm: MAX_RADIUS_KM }

/**
 * Sets up the players by name (adding players as needed), optionally the target score and
 * no timer, and starts the game.
 */
export async function setUpGame(page: Page, names: string[], options: { targetScore?: number; noTimer?: boolean } = {}) {
  for (const [i, name] of names.entries()) {
    if (i >= 2) await page.getByRole('button', { name: 'Spieler hinzufügen' }).click()
    await nameInput(page, i + 1).fill(name)
  }
  if (options.noTimer) await page.getByLabel('Zeit pro Zug').selectOption({ label: 'Ohne Zeitlimit' })
  const score = page.getByTestId('target-score')
  while (options.targetScore !== undefined && Number(await score.textContent()) > options.targetScore) {
    await page.getByRole('button', { name: 'Weniger' }).click()
  }
  await page.getByRole('button', { name: 'Spiel starten' }).click()
}

/** Plays one turn: submits `circle` (through the dev hook), or passes without one. */
export async function playTurn(page: Page, name: string, circle: Circle | null) {
  await startTurn(page, name)
  if (!circle) return page.getByRole('button', { name: 'Passen' }).click()
  await page.evaluate((c) => window.__eingekreist!.setCircle!(c), circle)
  await page.getByRole('button', { name: 'Abgeben' }).click()
}
