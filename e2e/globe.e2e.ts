import { expect, test } from '@playwright/test'
import { openGlobe } from './helpers'

test('Globus rendert ohne Fehler', async ({ page }) => {
  const { expectNoErrors } = await openGlobe(page)

  const projection = await page.evaluate(() => window.__eingekreist!.map.getProjection()?.type)
  expect(projection).toBe('globe')

  const center = await page.evaluate(() => window.__eingekreist!.map.getCenter().toArray())
  expect(center[0]).toBeCloseTo(10, 0)
  expect(center[1]).toBeCloseTo(20, 0)

  const canvas = page.locator('canvas.maplibregl-canvas')
  await expect(canvas).toBeVisible()
  expectNoErrors()
})

test('Ländergrenzen lassen sich ausblenden', async ({ page }) => {
  await openGlobe(page)
  const visibility = () =>
    page.evaluate(
      () => window.__eingekreist!.map.getLayoutProperty('borders', 'visibility') ?? 'visible',
    )

  expect(await visibility()).toBe('visible')
  await page.getByLabel('Ländergrenzen anzeigen').uncheck()
  expect(await visibility()).toBe('none')
  await page.getByLabel('Ländergrenzen anzeigen').check()
  expect(await visibility()).toBe('visible')
})
