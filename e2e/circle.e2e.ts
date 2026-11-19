import { expect, test, type Page } from '@playwright/test'
import { openGlobe } from './helpers'

const readout = (page: Page) => page.getByRole('status')

/** Parses „Radius: 1.230 km“ into 1230. */
async function radiusKm(page: Page): Promise<number> {
  const text = (await readout(page).textContent()) ?? ''
  const match = text.match(/([\d.,]+)\s*km/)
  if (!match) throw new Error(`no radius in "${text}"`)
  return Number(match[1].replace(/\./g, '').replace(',', '.'))
}

const mapCenter = (page: Page) =>
  page.evaluate(() => window.__eingekreist!.map.getCenter().toArray())

async function handleCenter(page: Page, kind: 'center' | 'radius') {
  const box = (await page.getByTestId(`handle-${kind}`).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function mouseDrag(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(from.x + (dx * i) / 10, from.y + (dy * i) / 10)
  await page.mouse.up()
}

/** Real touch events via CDP (Playwright's touchscreen only supports taps). */
async function touchDrag(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: string, x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    })
  await touch('touchStart', from.x, from.y)
  for (let i = 1; i <= 10; i++) await touch('touchMove', from.x + (dx * i) / 10, from.y + (dy * i) / 10)
  await touch('touchEnd', 0, 0)
  await cdp.detach()
}

test('places a circle and changes its radius', async ({ page }, testInfo) => {
  const { expectNoErrors } = await openGlobe(page)
  const isMobile = testInfo.project.name === 'mobile'
  await expect(readout(page)).toContainText('Tippe auf den Globus')

  const viewport = page.viewportSize()!
  const tap = { x: viewport.width / 2, y: viewport.height / 2 }
  if (isMobile) await page.touchscreen.tap(tap.x, tap.y)
  else await page.mouse.click(tap.x, tap.y)

  await expect(readout(page)).toContainText('Radius:')
  await expect(page.getByTestId('handle-center')).toBeVisible()
  await expect(page.getByTestId('handle-radius')).toBeVisible()
  const initial = await radiusKm(page)
  expect(initial).toBeGreaterThan(100)

  // Dragging the radius handle outwards grows the circle and does not move the globe.
  const centerBefore = await mapCenter(page)
  const drag = isMobile ? touchDrag : mouseDrag
  await drag(page, await handleCenter(page, 'radius'), 60, 0)
  const grown = await radiusKm(page)
  expect(grown).toBeGreaterThan(initial * 1.3)
  expect(await mapCenter(page)).toEqual(centerBefore)

  // Moving the center keeps the radius.
  const radiusBefore = await radiusKm(page)
  const before = await handleCenter(page, 'center')
  await drag(page, { x: before.x, y: before.y }, 0, -40)
  expect(await radiusKm(page)).toBe(radiusBefore)
  const after = await handleCenter(page, 'center')
  expect(after.y).toBeLessThan(before.y - 30)
  expect(await mapCenter(page)).toEqual(centerBefore)

  // Dragging it onto the center shrinks the circle.
  const c = await handleCenter(page, 'center')
  const r = await handleCenter(page, 'radius')
  await drag(page, r, c.x - r.x, c.y - r.y)
  expect(await radiusKm(page)).toBeLessThan(initial)

  expectNoErrors()
})

test('the radius never drops below 1 km', async ({ page }) => {
  await openGlobe(page)
  // Zoom in far so the handle can be dragged right onto the center.
  await page.evaluate(() => window.__eingekreist!.map.jumpTo({ center: [10, 50], zoom: 14 }))
  const viewport = page.viewportSize()!
  await page.mouse.click(viewport.width / 2, viewport.height / 2)
  await expect(readout(page)).toContainText('Radius:')
  const c = await handleCenter(page, 'center')
  const r = await handleCenter(page, 'radius')
  await mouseDrag(page, r, c.x - r.x + 1, c.y - r.y)
  expect(await radiusKm(page)).toBe(1)
})
