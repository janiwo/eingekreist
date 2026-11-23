import { expect, test } from '@playwright/test'

test('home screen icons and manifest are linked and served', async ({ page, request }) => {
  await page.goto('/')

  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  const touchResponse = await request.get(touchIcon!)
  expect(touchResponse.ok()).toBe(true)
  expect(touchResponse.headers()['content-type']).toContain('image/png')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifestUrl = new URL(manifestHref!, page.url())
  const manifest = await (await request.get(manifestUrl.href)).json()
  expect(manifest.icons.length).toBeGreaterThan(0)
  for (const icon of manifest.icons) {
    const response = await request.get(new URL(icon.src, manifestUrl).href)
    expect(response.ok(), icon.src).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
  }
})
