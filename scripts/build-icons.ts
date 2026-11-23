/**
 * Generates the app icons in public/ from one design: a yellow ring with a center dot and a
 * drag handle on a night-blue background (the circle of the game).
 *
 *   npm run build:icons
 *
 * Writes favicon.svg (browser tab), apple-touch-icon.png (iOS home screen, 180 px) and
 * icon-192.png / icon-512.png (web app manifest). Don't edit these files by hand.
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const COLORS = { bgCenter: '#1d3a5c', bg: '#0b1020', ring: '#f2b544', dot: '#f2efe8' }

/** Position of the drag handle on the ring, in degrees (clockwise from 3 o'clock, so negative is up). */
const HANDLE_ANGLE = -40

interface Design {
  /** Ring radius, ring stroke width, center dot radius, handle radius and handle outline, on a 1024 grid. */
  ring: number
  stroke: number
  dot: number
  handle: number
  outline: number
  /** Corner radius of the background. 0 for home screen icons: iOS and Android round them themselves. */
  corner: number
}

/**
 * Home screen design. The handle stays within the circle of radius 409 (80 % of the size),
 * the safe zone of Android's maskable icons.
 */
const HOME: Design = { ring: 300, stroke: 64, dot: 56, handle: 70, outline: 22, corner: 0 }

/** Favicon: bolder shapes so they still read at 16 px, rounded because the tab shows it as is. */
const FAVICON: Design = { ring: 290, stroke: 110, dot: 90, handle: 105, outline: 36, corner: 230 }

function svg(d: Design): string {
  const a = (HANDLE_ANGLE * Math.PI) / 180
  const hx = (512 + d.ring * Math.cos(a)).toFixed(1)
  const hy = (512 + d.ring * Math.sin(a)).toFixed(1)
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">',
    '<defs><radialGradient id="bg" cx="50%" cy="40%" r="75%">',
    `<stop offset="0" stop-color="${COLORS.bgCenter}"/><stop offset="1" stop-color="${COLORS.bg}"/>`,
    '</radialGradient></defs>',
    `<rect width="1024" height="1024" rx="${d.corner}" fill="url(#bg)"/>`,
    `<circle cx="512" cy="512" r="${d.ring}" fill="${COLORS.ring}" fill-opacity="0.1"/>`,
    `<circle cx="512" cy="512" r="${d.ring}" fill="none" stroke="${COLORS.ring}" stroke-width="${d.stroke}"/>`,
    `<circle cx="512" cy="512" r="${d.dot}" fill="${COLORS.dot}"/>`,
    `<circle cx="${hx}" cy="${hy}" r="${d.handle}" fill="${COLORS.dot}" stroke="${COLORS.bg}" stroke-width="${d.outline}"/>`,
    '</svg>',
    '',
  ].join('\n')
}

writeFileSync('public/favicon.svg', svg(FAVICON))

const home = svg(HOME)
const browser = await chromium.launch()
for (const [file, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
] as const) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${home}`,
  )
  await page.screenshot({ path: `public/${file}`, omitBackground: false })
  await page.close()
}
await browser.close()
console.log('Icons written to public/')
