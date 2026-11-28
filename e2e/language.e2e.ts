import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { PlaceFile } from '../src/data/placeCodec'
import { LOCALE_STORAGE_KEY } from '../src/i18n/locale'
import { HIT, openGlobe, startTurn, stored } from './helpers'

const placeFile = JSON.parse(readFileSync('src/data/places.json', 'utf8')) as PlaceFile
const englishName = (id: string) => placeFile.places.find((p) => p.id === id)?.name.en

test.describe('in an English browser', () => {
  test.use({ locale: 'en-US' })

  test('starts in English and plays a turn with English place names', async ({ page }) => {
    const app = await openGlobe(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Name of player 1')).toHaveValue('Player 1')
    await expect(page.locator('.credits')).toContainText('© OpenStreetMap contributors')

    await page.getByRole('button', { name: 'Start game' }).click()
    const handover = page.getByTestId('handover')
    await expect(handover).toContainText('Hand the device to Player 1')
    await startTurn(page)

    const prompt = page.getByTestId('prompt')
    const { round } = await stored(page)
    const name = englishName(round.placeId)
    expect(name).toBeTruthy()
    await expect(prompt.locator('.prompt__place')).toHaveText(name!)
    await expect(prompt).toContainText('Player 1’s turn')

    await page.evaluate((c) => window.__eingekreist!.setCircle!(c), HIT)
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(handover).toContainText('Hand the device to Player 2')
    app.expectNoErrors()
  })
})

test('switches the language on the start screen and in the instructions, and remembers it', async ({ page }) => {
  const app = await openGlobe(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.getByRole('button', { name: 'Spiel starten' })).toBeVisible()

  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // The map's own credits follow too.
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('© OpenStreetMap contributors')
  expect(await page.evaluate((key) => localStorage.getItem(key), LOCALE_STORAGE_KEY)).toBe('en')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible()

  await page.getByRole('button', { name: 'How to play' }).click()
  const dialog = page.getByRole('dialog')
  // Not the language switch: Enter right away must close, not switch.
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Deutsch' }).click()
  await expect(dialog.getByRole('heading', { name: 'So wird gespielt' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Verstanden' }).click()
  await expect(page.getByRole('button', { name: 'Spiel starten' })).toBeVisible()
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('© OpenStreetMap-Mitwirkende')
  app.expectNoErrors()
})
