import { expect, type Page } from '@playwright/test'

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

/** Starts a game from the setup screen with its current players and settings. */
export async function startGame(page: Page) {
  await page.getByRole('button', { name: 'Spiel starten' }).click()
  await expect(page.locator('[data-testid="prompt"][data-ready="true"]')).toBeVisible()
}
