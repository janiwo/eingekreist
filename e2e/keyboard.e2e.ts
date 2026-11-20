import { expect, test } from '@playwright/test'
import { openGlobe, radiusKm, readout, setUpGame } from './helpers'

test('plays a turn with the keyboard only', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)
  await setUpGame(page, [], { noTimer: true })

  // The handover takes the focus: Enter starts the turn, which focuses the globe.
  const handover = page.getByTestId('handover')
  await expect(handover).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-testid="prompt"][data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('region', { name: /^Globus/ })).toBeFocused()

  // Enter places the circle at the center of the view.
  const center = await page.evaluate(() => window.__eingekreist!.map.getCenter().toArray())
  await page.keyboard.press('Enter')
  await expect(readout(page)).toContainText('Radius:')
  const placed = await page.evaluate(() => window.__eingekreist!.map.getCenter().toArray())
  expect(placed).toEqual(center) // the globe didn't move

  // The center handle moves with the arrow keys, the globe stays put.
  const moveCenter = page.getByRole('button', { name: 'Mittelpunkt verschieben' })
  await moveCenter.focus()
  const before = await moveCenter.boundingBox()
  await page.keyboard.press('ArrowUp')
  await expect.poll(async () => (await moveCenter.boundingBox())!.y).toBeLessThan(before!.y - 5)
  expect(await page.evaluate(() => window.__eingekreist!.map.getCenter().toArray())).toEqual(center)

  // The radius handle steps the radius: Shift+ArrowUp +25 %, ArrowDown −5 %.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Radius ändern' })).toBeFocused()
  const r0 = await radiusKm(page)
  await page.keyboard.press('Shift+ArrowUp')
  await expect.poll(() => radiusKm(page)).toBeGreaterThan(r0 * 1.2)
  const r1 = await radiusKm(page)
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => radiusKm(page)).toBeLessThan(r1)

  // Submitting by keyboard leads to the next handover, which has the focus again.
  await page.getByRole('button', { name: 'Abgeben' }).focus()
  await page.keyboard.press('Enter')
  await expect(handover).toBeFocused()
  expectNoErrors()
})
