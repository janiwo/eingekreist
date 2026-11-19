import { expect, type Page } from '@playwright/test'

/** Loads the app and waits until the globe has finished rendering. */
export async function openGlobe(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/')
  await page.waitForFunction(() => window.__eingekreist?.map.loaded(), null, { timeout: 30_000 })
  return {
    expectNoErrors: () => expect(errors, errors.join('\n')).toEqual([]),
  }
}
