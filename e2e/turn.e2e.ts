import { expect, test, type Page } from '@playwright/test'
import { START_VIEW } from '../src/map/view'
import { nameInput, openGlobe, readout, startTurn, stored, tapGlobeCenter } from './helpers'

const handover = (page: Page) => page.getByTestId('handover')
const submit = (page: Page) => page.getByRole('button', { name: 'Abgeben' })
const pass = (page: Page) => page.getByRole('button', { name: 'Passen' })

/** Any trace of a circle: handles in the DOM, circle features on the map. */
const circleTraces = (page: Page) =>
  page.evaluate(async () => {
    // LAYER_ID in CircleEditor.tsx (not importable here: it pulls in MapLibre).
    const source = window.__eingekreist!.map.getSource('edit-circle') as
      | { getData: () => Promise<GeoJSON.FeatureCollection> }
      | undefined
    return {
      handles: document.querySelectorAll('.handle').length,
      features: source ? (await source.getData()).features.length : 0,
    }
  })

async function setUpGame(page: Page, names: string[]) {
  for (const [i, name] of names.entries()) {
    if (i >= 2) await page.getByRole('button', { name: 'Spieler hinzufügen' }).click()
    await nameInput(page, i + 1).fill(name)
  }
  await page.getByRole('button', { name: 'Spiel starten' }).click()
}

test('plays a round with three players: submit, pass, timeout', async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === 'mobile'
  // Fake clock (runs normally until fast-forwarded), so the 60 s timeout needs no waiting.
  await page.clock.install()
  const { expectNoErrors } = await openGlobe(page)
  await setUpGame(page, ['Anna', 'Ben', 'Cem'])

  // Handover: neither globe, prompt nor timer before tapping.
  await expect(handover(page)).toContainText('Gib das Gerät an Anna')
  await expect(page.getByTestId('prompt')).toHaveCount(0)
  await expect(page.getByRole('timer')).toHaveCount(0)

  // Anna: places a circle (after moving the globe) and submits.
  await startTurn(page, 'Anna')
  await expect(page.getByTestId('prompt')).toContainText('Anna ist dran')
  await expect(page.getByRole('timer')).toHaveText('60 s')
  await expect(submit(page)).toBeDisabled()
  await page.evaluate(() => window.__eingekreist!.map.jumpTo({ center: [-60, -10], zoom: 3 }))
  await tapGlobeCenter(page, isMobile)
  await submit(page).click()

  // Ben: no trace of Anna's circle, the globe is back at the start view; he passes.
  await expect(handover(page)).toContainText('Gib das Gerät an Ben')
  expect(await circleTraces(page)).toEqual({ handles: 0, features: 0 })
  await startTurn(page, 'Ben')
  expect(await circleTraces(page)).toEqual({ handles: 0, features: 0 })
  await expect(readout(page)).toContainText('Tippe auf den Globus')
  const view = await page.evaluate(() => {
    const map = window.__eingekreist!.map
    return { center: map.getCenter().toArray(), zoom: map.getZoom() }
  })
  expect(view.center[0]).toBeCloseTo(START_VIEW.center[0], 5)
  expect(view.center[1]).toBeCloseTo(START_VIEW.center[1], 5)
  expect(view.zoom).toBeCloseTo(START_VIEW.zoom, 5)
  await pass(page).click()

  // Cem: lets the time run out without a circle.
  await startTurn(page, 'Cem')
  await page.clock.fastForward(50_000)
  await expect(page.getByRole('timer')).toHaveClass(/timer--low/) // last 10 s
  await page.clock.fastForward(11_000)

  await expect(page.getByTestId('round-over')).toBeVisible()
  await expect(page.getByTestId('round-over')).toContainText('Runde 1 beendet')
  const rows = page.getByTestId('round-over').getByRole('listitem')
  await expect(rows).toHaveText(['AnnaKreis abgegeben', 'BenGepasst', 'CemZeit abgelaufen'])

  const { round } = await stored(page)
  expect(round.turns.map((t: { outcome: string }) => t.outcome)).toEqual(['submitted', 'passed', 'timedOut'])
  expect(round.turns[0].circle.radiusKm).toBeGreaterThan(0)
  expectNoErrors()
})

test('submits a placed circle when the time runs out', async ({ page }, testInfo) => {
  await page.clock.install()
  const { expectNoErrors } = await openGlobe(page)
  await page.getByLabel('Zeit pro Zug').selectOption({ label: '30 Sekunden' })
  await setUpGame(page, ['Anna', 'Ben'])
  await startTurn(page, 'Anna')
  await tapGlobeCenter(page, testInfo.project.name === 'mobile')
  await page.clock.fastForward(31_000)

  await expect(handover(page)).toContainText('Gib das Gerät an Ben')
  const { round } = await stored(page)
  expect(round.turns).toEqual([expect.objectContaining({ playerId: 'p1', outcome: 'submitted' })])
  expect(round.turns[0].circle).not.toBeNull()
  expectNoErrors()
})

test('a reload keeps the turn, its timer and the placed circle', async ({ page }, testInfo) => {
  await page.clock.install()
  await openGlobe(page)
  await setUpGame(page, ['Anna', 'Ben'])
  await startTurn(page, 'Anna')
  await tapGlobeCenter(page, testInfo.project.name === 'mobile')
  const radius = await readout(page).textContent()
  await page.clock.fastForward(20_000)
  const { expectNoErrors } = await openGlobe(page)
  await expect(page.getByTestId('prompt')).toContainText('Anna ist dran')
  // Not reset to 60 s (some real time passes while the page reloads).
  const seconds = Number((await page.getByRole('timer').textContent())?.replace(' s', ''))
  expect(seconds).toBeLessThanOrEqual(40)
  expect(seconds).toBeGreaterThan(20)
  // …and the circle placed before the reload.
  await expect(readout(page)).toHaveText(radius!)
  await expect(page.getByTestId('handle-center')).toBeVisible()
  expectNoErrors()
})
