import { expect, test, type Page } from '@playwright/test'
import { CIRCLES_LAYER_ID, PLACE_LAYER_ID } from '../src/map/RevealLayers'
import { HIT, MISS, nameInput, openGlobe, playTurn, setUpGame, stored } from './helpers'

const reveal = (page: Page) => page.getByTestId('reveal')
const handover = (page: Page) => page.getByTestId('handover')

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
  await setUpGame(page, ['Anna', 'Ben'], { targetScore: 2, noTimer: true })

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

  // Anna misses, Ben hits: 1 : 2.
  await playTurn(page, 'Anna', MISS)
  await playTurn(page, 'Ben', HIT)
  await expect(reveal(page)).toContainText('Ben holt den Punkt')
  await expect(rows(page)).toHaveText([/Ben20\.000 km✓ Treffer\+1 2/, /Anna1 km✗ Daneben\s*1$/])
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

test('sudden death: only the tied leaders play on until one leads alone', async ({ page }) => {
  test.setTimeout(90_000)
  const { expectNoErrors } = await openGlobe(page)
  await setUpGame(page, ['Anna', 'Ben', 'Cem'], { targetScore: 1, noTimer: true })

  // Anna and Ben hit with the same radius at target score 1, Cem misses: Cem is out.
  await playTurn(page, 'Anna', HIT)
  await playTurn(page, 'Ben', HIT)
  await playTurn(page, 'Cem', MISS)
  await expect(page.getByTestId('sudden-death')).toContainText('Stechen! Nur Anna und Ben spielen weiter')
  await page.getByRole('button', { name: 'Nächste Runde' }).click()

  // Nobody hits: still tied. After Anna and Ben the round is over: Cem gets no turn.
  await playTurn(page, 'Anna', MISS)
  await playTurn(page, 'Ben', MISS)
  await expect(reveal(page)).toContainText('Niemand hat getroffen')
  await expect(reveal(page).getByRole('row', { name: /^Anna / })).toContainText('✗ Daneben')
  await expect(reveal(page).getByRole('row', { name: /^Cem / })).toContainText('Ausgeschieden')
  await page.getByRole('button', { name: 'Nächste Runde' }).click()

  await playTurn(page, 'Anna', MISS)
  await playTurn(page, 'Ben', HIT)
  await page.getByRole('button', { name: 'Zum Ergebnis' }).click()
  await expect(page.getByTestId('end')).toContainText('Ben gewinnt!')
  await page.getByRole('button', { name: 'Neues Spiel' }).click()
  await expect(nameInput(page, 1)).toHaveValue('Spieler 1')
  expectNoErrors()
})
