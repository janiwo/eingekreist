import { expect, test, type Page } from '@playwright/test'
import { openGlobe, radiusKm, readout, startGame, stored, tapGlobeCenter } from './helpers'

const mapCenter = (page: Page) =>
  page.evaluate(() => window.__eingekreist!.map.getCenter().toArray())

async function handleCenter(page: Page, kind: 'center' | 'radius') {
  const box = (await page.getByTestId(`handle-${kind}`).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

type Point = { x: number; y: number }
type Drag = (page: Page, from: Point, dx: number, dy: number) => Promise<void>

/** Presses at `from`, moves by (dx, dy) in ten steps and releases. */
async function stepwise(from: Point, dx: number, dy: number, move: (x: number, y: number) => Promise<unknown>) {
  for (let i = 1; i <= 10; i++) await move(from.x + (dx * i) / 10, from.y + (dy * i) / 10)
}

const mouseDrag: Drag = async (page, from, dx, dy) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await stepwise(from, dx, dy, (x, y) => page.mouse.move(x, y))
  await page.mouse.up()
}

/** Real touch events via CDP (Playwright's touchscreen only supports taps). */
const touchDrag: Drag = async (page, from, dx, dy) => {
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: string, points: Point[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
  await touch('touchStart', [from])
  await stepwise(from, dx, dy, (x, y) => touch('touchMove', [{ x, y }]))
  await touch('touchEnd', [])
  await cdp.detach()
}

/** Drags the radius handle onto the center handle, `nudgeX` px to its right. */
async function dragRadiusOntoCenter(page: Page, drag: Drag, nudgeX = 0) {
  const c = await handleCenter(page, 'center')
  const r = await handleCenter(page, 'radius')
  await drag(page, r, c.x - r.x + nudgeX, c.y - r.y)
}

test('places a circle and changes its radius', async ({ page }, testInfo) => {
  const { expectNoErrors } = await openGlobe(page)
  await startGame(page)
  const isMobile = testInfo.project.name === 'mobile'
  await expect(readout(page)).toContainText('Tippe auf den Globus')

  await tapGlobeCenter(page, isMobile)
  await expect(page.getByTestId('handle-center')).toBeVisible()
  await expect(page.getByTestId('handle-radius')).toBeVisible()
  const initial = await radiusKm(page)
  expect(initial).toBeGreaterThan(100)

  // Dragging the radius handle outwards grows the circle and does not move the globe.
  const centerBefore = await mapCenter(page)
  const drag = isMobile ? touchDrag : mouseDrag
  await drag(page, await handleCenter(page, 'radius'), 60, 0)
  await expect.poll(() => radiusKm(page)).toBeGreaterThan(initial * 1.3)
  const grown = await radiusKm(page)
  expect(await mapCenter(page)).toEqual(centerBefore)

  // Moving the center keeps the radius.
  const before = await handleCenter(page, 'center')
  await drag(page, before, 0, -40)
  await expect.poll(() => radiusKm(page)).toBe(grown)
  const after = await handleCenter(page, 'center')
  expect(after.y).toBeLessThan(before.y - 30)
  expect(await mapCenter(page)).toEqual(centerBefore)

  // Dragging it onto the center shrinks the circle.
  await dragRadiusOntoCenter(page, drag)
  await expect.poll(() => radiusKm(page)).toBeLessThan(initial)

  expectNoErrors()
})

test('the radius never drops below 1 km', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)
  await startGame(page)
  // Zoom in far so the handle can be dragged right onto the center.
  await page.evaluate(() => window.__eingekreist!.map.jumpTo({ center: [10, 50], zoom: 14 }))
  await tapGlobeCenter(page, false)
  await dragRadiusOntoCenter(page, mouseDrag, 1)
  await expect.poll(() => radiusKm(page)).toBe(1)
  expectNoErrors()
})

test('a tiny drag that ends just off a handle does not move the circle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch only: the browser turns the short drag into a tap')
  const { expectNoErrors } = await openGlobe(page)
  await startGame(page)
  await page.evaluate(() => window.__eingekreist!.map.jumpTo({ center: [10, 50], zoom: 12 }))
  await tapGlobeCenter(page, true)

  for (const kind of ['center', 'radius'] as const) {
    const circleBefore = await stored(page)
    const centerBefore = await handleCenter(page, 'center')
    // Grab near the edge of the 44px touch target and move a few px, within the tap slop:
    // the lift point lies just outside the handle, so the browser's click lands on the canvas.
    const h = await handleCenter(page, kind)
    await touchDrag(page, { x: h.x + 15, y: h.y + 10 }, 6, 0)
    await page.waitForTimeout(300)
    expect(await handleCenter(page, 'center')).toEqual(centerBefore)
    expect(await stored(page)).toEqual(circleBefore)
  }
  expectNoErrors()
})

test('taps in space next to the globe are ignored', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)
  await startGame(page)
  await page.mouse.click(5, page.viewportSize()!.height - 5)
  await expect(readout(page)).toContainText('Tippe auf den Globus')
  await expect(page.getByTestId('handle-center')).toHaveCount(0)
  expectNoErrors()
})

const minButton = (page: Page) => page.getByRole('button', { name: 'Kleinster Kreis (1 km)' })
const zoom = (page: Page) => page.evaluate(() => window.__eingekreist!.map.getZoom())

test('the target button shrinks the circle to 1 km and zooms in until the handles separate', async ({ page }, testInfo) => {
  const { expectNoErrors } = await openGlobe(page)
  await startGame(page)
  const isMobile = testInfo.project.name === 'mobile'
  await expect(minButton(page)).toBeDisabled()

  await page.evaluate(() => window.__eingekreist!.map.jumpTo({ center: [10, 50], zoom: 5 }))
  await tapGlobeCenter(page, isMobile)
  const placed = (await stored(page)).round.draft
  expect(placed.radiusKm).toBeGreaterThan(1)

  if (isMobile) await minButton(page).tap()
  else await minButton(page).click()
  await expect.poll(() => radiusKm(page)).toBe(1)
  await expect(minButton(page)).toBeDisabled()
  expect((await stored(page)).round.draft.center).toEqual(placed.center)

  // The globe eases in on the center until the radius handle sits clear of the center handle.
  await page.waitForFunction(() => !window.__eingekreist!.map.isMoving())
  expect(await zoom(page)).toBeGreaterThan(10)
  const c = await handleCenter(page, 'center')
  const r = await handleCenter(page, 'radius')
  expect(Math.hypot(r.x - c.x, r.y - c.y)).toBeGreaterThan(25)
  expectNoErrors()
})

test('the target button never zooms out', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)
  await startGame(page)
  // Zoomed in further than the button would: a 5 km circle (a new one would start at 1 km here).
  await page.evaluate(() => window.__eingekreist!.map.jumpTo({ center: [10, 50], zoom: 15 }))
  await page.evaluate(() => window.__eingekreist!.setCircle!({ center: [10, 50], radiusKm: 5 }))
  await minButton(page).click()
  await expect.poll(() => radiusKm(page)).toBe(1)
  await page.waitForTimeout(300)
  expect(await zoom(page)).toBe(15)
  expectNoErrors()
})
