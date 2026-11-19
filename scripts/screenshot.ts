/**
 * Startet einen Vite-Dev-Server, öffnet die App in headless Chromium und speichert Screenshots.
 *
 *   npm run screenshot                      → screenshots/desktop.png + screenshots/mobile.png
 *   npm run screenshot -- /pfad?x=1 name    → eigener Pfad / Dateiname-Präfix
 *   npm run screenshot -- / arktis 0,80,2   → Kamera auf Länge,Breite,Zoom setzen
 */
import { chromium, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createServer } from 'vite'
import { webglArgs } from '../playwright.config.ts'

const [path = '/', prefix = '', view] = process.argv.slice(2)
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
      .waitForFunction(() => window.__eingekreist?.map.loaded(), null, { timeout: 30_000 })
      .catch(() => logs.push('timeout: Globus nicht geladen'))
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
    await page.waitForTimeout(500)
    const canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas.maplibregl-canvas')
      return c ? `${c.clientWidth}×${c.clientHeight}` : 'fehlt'
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
