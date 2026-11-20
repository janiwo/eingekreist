/**
 * Starts a Vite dev server, opens the app in headless Chromium and saves screenshots.
 *
 *   npm run screenshot                      → screenshots/desktop.png + screenshots/mobile.png
 *   npm run screenshot -- /pfad?x=1 name    → custom path / file name prefix
 *   npm run screenshot -- --game / game      → start a game (seed 1) and its first turn
 *   npm run screenshot -- --handover / handover → start a game, stay on the handover screen
 *   npm run screenshot -- --game / arctic 0,80,2   → set camera to lng,lat,zoom
 *   npm run screenshot -- --game / pole 0,80,2 0,85,1500 → also draw a circle at lng,lat with radius km
 *   npm run screenshot -- --reveal / reveal 2,47,300 → play a round (each player draws a circle at lng,lat,
 *                                                     the radius growing per player) and show the reveal
 *   npm run screenshot -- --reveal --seed=135 / russia 170,65,500 → another seed: another first place
 *   npm run screenshot -- --end / end         → play a game to target score 1 and show the end screen
 *   npm run screenshot -- "/?debug=places&place=france" france → show a place (view fits to it)
 */
import { chromium, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createServer } from 'vite'
import { webglArgs } from '../playwright.config.ts'

const args = process.argv.slice(2)
const handover = args.includes('--handover')
const end = args.includes('--end')
const reveal = end || args.includes('--reveal')
const game = handover || reveal || args.includes('--game')
const seed = Number(args.find((a) => a.startsWith('--seed='))?.slice('--seed='.length) ?? 1)
const positional = args.filter((a) => !a.startsWith('--'))
const [path = '/', prefix = ''] = positional
// --reveal takes the circle right after the prefix; it has no camera view (the reveal sets it).
const [view, circle] = reveal ? [undefined, positional[2] ?? '10,20,1000'] : positional.slice(2)
if (circle && !game) throw new Error('drawing a circle needs --game (the circle editor is part of a turn)')
if (circle && handover) throw new Error('--handover shows no circle')
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
    // At --end, target score 1: the first round decides the game.
    const settings = end ? { targetScore: 1 } : undefined
    if (game) await page.evaluate(({ seed, settings }) => window.__eingekreist!.startGame!(seed, settings), { seed, settings })
    if (reveal) {
      const [lng, lat, radiusKm] = circle!.split(',').map(Number)
      // Every player has a turn; the radius grows by half per player. At --end the first circle
      // covers the whole globe, so someone surely hits and the game ends.
      await page.getByTestId('handover').waitFor()
      for (let i = 0; await page.getByTestId('handover').isVisible(); i++) {
        await page.getByTestId('handover').click()
        await page.locator('[data-testid="prompt"][data-ready="true"]').waitFor()
        const r = end && i === 0 ? 20_000 /* MAX_RADIUS_KM */ : radiusKm * (1 + i / 2)
        await page.evaluate((c) => window.__eingekreist!.setCircle!(c), { center: [lng, lat], radiusKm: r })
        await page.getByRole('button', { name: 'Abgeben' }).click()
        await page.getByTestId('handover').or(page.getByTestId('reveal')).waitFor()
      }
      if (end) {
        await page.getByTestId('reveal').getByRole('button').click()
        await page.getByTestId('end').waitFor()
      }
    } else if (game && !handover) await page.getByTestId('handover').click()
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
    if (circle && !reveal) {
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
