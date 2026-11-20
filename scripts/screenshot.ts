/**
 * Starts a Vite dev server, opens the app in headless Chromium and saves screenshots.
 *
 *   npm run screenshot                      → screenshots/desktop.png + screenshots/mobile.png
 *   npm run screenshot -- /pfad?x=1 name    → custom path / file name prefix
 *   npm run screenshot -- --game / game      → start a game (seed 1) and its first turn
 *   npm run screenshot -- --handover / handover → start a game, stay on the handover screen
 *   npm run screenshot -- --game / arctic 0,80,2   → set camera to lng,lat,zoom
 *   npm run screenshot -- --game / pole 0,80,2 0,85,1500 → also draw a circle at lng,lat with radius km
 *   npm run screenshot -- "/?debug=places&place=france" france → show a place (view fits to it)
 */
import { chromium, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createServer } from 'vite'
import { webglArgs } from '../playwright.config.ts'

const args = process.argv.slice(2)
const handover = args.includes('--handover')
const game = handover || args.includes('--game')
const [path = '/', prefix = '', view, circle] = args.filter((a) => !a.startsWith('--'))
if (circle && (!game || handover)) throw new Error('drawing a circle needs --game (the circle editor is part of a turn)')
const outDir = 'screenshots'
mkdirSync(outDir, { recursive: true })

const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
await server.listen()
const url = new URL(path, server.resolvedUrls!.local[0]).toString()

const browser = await chromium.launch({ args: webglArgs })
try {
  const targets = { desktop: devices['Desktop Chrome'], mobile: devices['Pixel 7'] }
  for (const [name, device] of Object.entries(targets)) {
    const context = await browser.newContext(device)
    const page = await context.newPage()
    const logs: string[] = []
    page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(`${m.type()}: ${m.text()}`))

    await page.goto(url)
    await page
      // startGame is registered by the app right after the map has loaded.
      .waitForFunction(
        (game) => window.__eingekreist?.map.loaded() && (!game || window.__eingekreist.startGame),
        game,
        { timeout: 30_000 },
      )
      .catch(() => logs.push('timeout: globe not loaded'))
    if (game) await page.evaluate(() => window.__eingekreist!.startGame!(1))
    if (game && !handover) await page.getByTestId('handover').click()
    // Components that settle asynchronously mark themselves data-ready="false" until done.
    await page.evaluate(() => new Promise(requestAnimationFrame))
    await page
      .waitForFunction(() => !document.querySelector('[data-ready="false"]'), null, { timeout: 30_000 })
      .catch(() => logs.push('timeout: [data-ready="false"] still present'))
    if (view) {
      const [lng, lat, zoom] = view.split(',').map(Number)
      await page.evaluate(
        ({ lng, lat, zoom }) =>
          new Promise<void>((resolve) => {
            const map = window.__eingekreist!.map
            map.once('idle', () => resolve())
            map.jumpTo({ center: [lng, lat], zoom })
          }),
        { lng, lat, zoom },
      )
    }
    if (circle) {
      const [lng, lat, radiusKm] = circle.split(',').map(Number)
      await page.evaluate(
        ({ lng, lat, radiusKm }) =>
          new Promise<void>((resolve) => {
            const { map, setCircle } = window.__eingekreist!
            map.once('idle', () => resolve())
            setCircle!({ center: [lng, lat], radiusKm })
          }),
        { lng, lat, radiusKm },
      )
    }
    await page.waitForTimeout(500)
    const canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas.maplibregl-canvas')
      return c ? `${c.clientWidth}×${c.clientHeight}` : 'missing'
    })
    logs.push(`canvas: ${canvas}`)

    const file = `${outDir}/${prefix ? `${prefix}-` : ''}${name}.png`
    await page.screenshot({ path: file })
    console.log(`✓ ${file}`)
    for (const l of logs) console.log(`  ${l}`)
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
