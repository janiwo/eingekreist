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
  // Without a circle there is nothing to fly to.
  await expect(reveal(page).getByRole('row', { name: /^Cem / }).getByRole('button')).toHaveCount(0)
  await page.getByRole('button', { name: 'Nächste Runde' }).click()

  await playTurn(page, 'Anna', MISS)
  await playTurn(page, 'Ben', HIT)
  await page.getByRole('button', { name: 'Zum Ergebnis' }).click()
  await expect(page.getByTestId('end')).toContainText('Ben gewinnt!')
  await page.getByRole('button', { name: 'Neues Spiel' }).click()
  await expect(nameInput(page, 1)).toHaveValue('Spieler 1')
  expectNoErrors()
})

/** The camera, once the globe has stopped moving. */
async function settledCamera(page: Page) {
  await page.waitForFunction(() => !window.__eingekreist!.map.isMoving())
  return page.evaluate(() => {
    const map = window.__eingekreist!.map
    const { lng, lat } = map.getCenter()
    return { lng, lat, zoom: map.getZoom() }
  })
}

test('flies to a player\'s circle and back to the place', async ({ page }) => {
  test.setTimeout(60_000)
  const { expectNoErrors } = await openGlobe(page)
  await nameInput(page, 1).fill('Anna')
  await nameInput(page, 2).fill('Ben')
  // A fixed seed, so a fixed place (Australia): zoomed in on Ben's circle, the globe renders
  // as Mercator, and from there MapLibre's own fit missed this place by about 90° of longitude.
  await page.evaluate(() => window.__eingekreist!.startGame!(7, { turnSeconds: null }))
  await playTurn(page, 'Anna', HIT)
  await playTurn(page, 'Ben', MISS)
  await expect(reveal(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 })
  await expect(page.locator('header')).toContainText('Australien')
  const placeView = await settledCamera(page)

  // At the place, there is no way back to show.
  const target = reveal(page).getByRole('button', { name: /^Zum Ziel: / })
  await expect(target).toBeHidden()

  // Ben's tiny miss: the globe zooms right in on it, above the card.
  await reveal(page).getByRole('row', { name: /^Ben / }).click()
  await expect(target).toBeVisible()
  const benView = await settledCamera(page)
  expect(benView.zoom).toBeGreaterThan(12)
  const [x, y] = await page.evaluate((c) => {
    const { x, y } = window.__eingekreist!.map.project(c)
    return [x, y]
  }, MISS.center)
  const card = (await reveal(page).boundingBox())!
  const { width } = page.viewportSize()!
  expect(x).toBeGreaterThan(0)
  expect(x).toBeLessThan(width)
  expect(y).toBeGreaterThan(0)
  expect(y < card.y || x < card.x).toBe(true)

  // Back to the place: the button hides at once, the camera returns to the reveal's view.
  await target.click()
  await expect(target).toBeHidden()
  const back = await settledCamera(page)
  expect(back.zoom).toBeCloseTo(placeView.zoom, 2)
  expect(back.lat).toBeCloseTo(placeView.lat, 2)
  expect(back.lng).toBeCloseTo(placeView.lng, 2)

  // Moving the globe by hand leaves the place's view, too.
  await page.locator('canvas').focus()
  await page.keyboard.press('ArrowRight')
  await expect(target).toBeVisible()
  expectNoErrors()
})

test('collapses the result card to a bar and expands it again, without moving the globe', async ({ page }) => {
  test.setTimeout(60_000)
  const { expectNoErrors } = await openGlobe(page)
  await nameInput(page, 1).fill('Anna')
  await nameInput(page, 2).fill('Ben')
  // A fixed seed, so a fixed place (the Sahara).
  await page.evaluate(() => window.__eingekreist!.startGame!(1, { turnSeconds: null }))
  await playTurn(page, 'Anna', HIT)
  await playTurn(page, 'Ben', MISS)
  await expect(reveal(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 })
  await expect(page.locator('header')).toContainText('Sahara')
  const placeView = await settledCamera(page)
  const bar = page.getByTestId('reveal-bar')
  await expect(bar).toBeHidden()

  // Collapsed: the table is gone, the bar shows the winner and the way on; the globe stays put.
  await page.getByRole('button', { name: 'Ergebnisse einklappen' }).click()
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('Anna holt den Punkt')
  await expect(reveal(page).getByRole('table')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Ergebnisse anzeigen' })).toBeFocused()
  const collapsedView = await settledCamera(page)
  expect(collapsedView).toEqual(placeView)

  // Away from the place, the way back shows in the bar and returns to the same view as before.
  await page.locator('canvas').focus()
  await page.keyboard.press('ArrowRight')
  const target = bar.getByRole('button', { name: /^Zum Ziel: / })
  await expect(target).toBeVisible()
  await target.click()
  await expect(target).toBeHidden()
  const back = await settledCamera(page)
  expect(back.zoom).toBeCloseTo(placeView.zoom, 1)
  expect(back.lat).toBeCloseTo(placeView.lat, 0)
  expect(back.lng).toBeCloseTo(placeView.lng, 0)

  // A tap on the bar expands the card again.
  await bar.getByText('Anna holt den Punkt').click()
  await expect(bar).toBeHidden()
  await expect(reveal(page).getByRole('table')).toBeVisible()

  // Collapsed, the bar's button moves on; the next reveal starts expanded.
  await page.getByRole('button', { name: 'Ergebnisse einklappen' }).click()
  await bar.getByRole('button', { name: 'Nächste Runde' }).click()
  await playTurn(page, 'Anna', MISS)
  await playTurn(page, 'Ben', MISS)
  await expect(reveal(page).getByRole('table')).toBeVisible()
  await expect(bar).toBeHidden()
  expectNoErrors()
})
