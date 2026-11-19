import { expect, test, type Page } from '@playwright/test'
import { openGlobe } from './helpers'

const info = (page: Page) => page.getByTestId('debug-place-info')

/** Number of features in the debug layer's source. */
const shownFeatures = (page: Page) =>
  page.evaluate(() => window.__eingekreist!.map.querySourceFeatures('debug-place').length)

test('debug view shows a place from the URL and by search', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page, '/?debug=places&place=france')

  await expect(info(page)).toContainText('Frankreich')
  await expect(page.locator('.debug-panel[data-ready="true"]')).toBeAttached()
  expect(await shownFeatures(page)).toBeGreaterThan(0)
  // The view was fitted to France
  const [lng, lat] = await page.evaluate(() => window.__eingekreist!.map.getCenter().toArray())
  expect(Math.abs(lng)).toBeLessThan(60)
  expect(lat).toBeGreaterThan(-30)

  const search = page.getByRole('combobox', { name: 'Ort (Name oder ID)' })
  await search.fill('Sahara')
  await expect(info(page)).toContainText('Sahara · sahara')
  await search.fill('gibt es nicht')
  await expect(info(page)).toContainText('Kein Ort gefunden')

  expectNoErrors()
})

test('shows the map data attribution', async ({ page }) => {
  await openGlobe(page)
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('© OpenStreetMap-Mitwirkende')
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('Natural Earth')
})

test('the debug view is off without the URL flag', async ({ page }) => {
  await openGlobe(page)
  await expect(page.locator('.debug-panel')).toHaveCount(0)
})
