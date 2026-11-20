import { expect, test, type Page } from '@playwright/test'
import { CIRCLES_LAYER_ID, PLACE_LAYER_ID } from '../src/map/RevealLayers'
import { nameInput, openGlobe, startTurn, stored } from './helpers'

/** Covers the whole globe but a tiny cap: hits every place. */
const HIT = { center: [0, 0], radiusKm: 20_000 }

const reveal = (page: Page) => page.getByTestId('reveal')
const handover = (page: Page) => page.getByTestId('handover')

/** Plays one turn: submits `circle`, or passes without one. */
async function playTurn(page: Page, name: string, circle: typeof HIT | null) {
  await startTurn(page, name)
  if (!circle) return page.getByRole('button', { name: 'Passen' }).click()
  await page.evaluate((c) => window.__eingekreist!.setCircle!(c as never), circle)
  await page.getByRole('button', { name: 'Abgeben' }).click()
}

/** Whether the reveal's layers are on the map. */
const revealLayers = (page: Page) =>
  page.evaluate(
    (ids) => ids.map((id) => window.__eingekreist!.map.getSource(id) !== undefined),
    [PLACE_LAYER_ID, CIRCLES_LAYER_ID],
  )

const rows = (page: Page) => reveal(page).locator('tbody tr')

test('plays a game to target score 2, through a tie and sudden death', async ({ page }) => {
  test.setTimeout(90_000)
  const { expectNoErrors } = await openGlobe(page)
  await nameInput(page, 1).fill('Anna')
  await nameInput(page, 2).fill('Ben')
  await page.getByLabel('Zeit pro Zug').selectOption({ label: 'Ohne Zeitlimit' })
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Weniger' }).click()
  await expect(page.getByTestId('target-score')).toHaveText('2')
  await page.getByRole('button', { name: 'Spiel starten' }).click()

  // Round 1: same radius, both hit → tie, both get a point.
  await playTurn(page, 'Anna', HIT)
  await playTurn(page, 'Ben', HIT)
  await expect(reveal(page)).toContainText('Auflösung Runde 1')
  await expect(reveal(page)).toContainText('Anna und Ben holen je einen Punkt')
  await expect(rows(page)).toHaveText([/Anna20\.000 km✓ Treffer\+1 1/, /Ben20\.000 km✓ Treffer\+1 1/])
  expect(await revealLayers(page)).toEqual([true, true])
  // The globe flies to the place and settles there.
  await expect(reveal(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 })
  const place = (await stored(page)).round.placeId
  expect(await page.evaluate(() => window.__eingekreist!.map.getZoom())).toBeGreaterThan(1.4)
  await page.getByRole('button', { name: 'Nächste Runde' }).click()

  // Round 2: a new place, no trace of the reveal.
  await expect(handover(page)).toContainText('Anna')
  expect(await revealLayers(page)).toEqual([false, false])
  expect((await stored(page)).round.placeId).not.toBe(place)

  // Anna passes, Ben hits: 1 : 2.
  await playTurn(page, 'Anna', null)
  await playTurn(page, 'Ben', HIT)
  await expect(reveal(page)).toContainText('Ben holt den Punkt')
  await expect(rows(page)).toHaveText([/Ben20\.000 km✓ Treffer\+1 2/, /AnnaGepasst\s*1$/])
  // Ben leads alone at the target: on to the result.
  await page.getByRole('button', { name: 'Zum Ergebnis' }).click()

  const end = page.getByTestId('end')
  await expect(end).toContainText('Ben gewinnt!')
  await expect(end).toContainText('nach 2 Runden')
  await expect(end.getByRole('listitem')).toHaveText(['1.Ben2 Punkte', '2.Anna1 Punkt'])

  // Reload keeps the end screen.
  await openGlobe(page)
  await expect(end).toContainText('Ben gewinnt!')

  // Play again: same players, scores reset.
  await page.getByRole('button', { name: 'Nochmal spielen' }).click()
  await expect(handover(page)).toContainText('Runde 1')
  const again = await stored(page)
  expect(again.players.map((p: { name: string; score: number }) => [p.name, p.score])).toEqual([
    ['Anna', 0],
    ['Ben', 0],
  ])
  expect(again.settings.targetScore).toBe(2)
  expectNoErrors()
})

test('sudden death: a tie at the target score plays on until one leads alone', async ({ page }) => {
  test.setTimeout(90_000)
  const { expectNoErrors } = await openGlobe(page)
  await nameInput(page, 1).fill('Anna')
  await nameInput(page, 2).fill('Ben')
  await page.getByLabel('Zeit pro Zug').selectOption({ label: 'Ohne Zeitlimit' })
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Weniger' }).click()
  await page.getByRole('button', { name: 'Spiel starten' }).click()

  // Both hit with the same radius at target score 1.
  await playTurn(page, 'Anna', HIT)
  await playTurn(page, 'Ben', HIT)
  await expect(page.getByTestId('sudden-death')).toContainText('Stechen')
  await page.getByRole('button', { name: 'Nächste Runde' }).click()

  // Nobody hits: still tied (a 1 km circle in the far South Pacific misses every place).
  await playTurn(page, 'Anna', { center: [-150, -60], radiusKm: 1 })
  await playTurn(page, 'Ben', null)
  await expect(reveal(page)).toContainText('Niemand hat getroffen')
  await expect(rows(page).nth(0)).toContainText('✗ Daneben')
  await page.getByRole('button', { name: 'Nächste Runde' }).click()

  await playTurn(page, 'Anna', null)
  await playTurn(page, 'Ben', HIT)
  await page.getByRole('button', { name: 'Zum Ergebnis' }).click()
  await expect(page.getByTestId('end')).toContainText('Ben gewinnt!')
  await page.getByRole('button', { name: 'Neues Spiel' }).click()
  await expect(nameInput(page, 1)).toHaveValue('Spieler 1')
  expectNoErrors()
})
