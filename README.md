# Eingekreist

Geography party game for 2–8 players on one device: whoever hits the named place with the smallest circle scores. Details in [SPEC.md](SPEC.md), work plan in [MILESTONES.md](MILESTONES.md). The app's UI is German and English; everything else is English.

## Development

```sh
npm install
npm run dev      # dev server
npm test         # unit tests (Vitest)
npm run lint     # oxlint
npm run build    # typecheck + production build to dist/
npm run e2e      # browser tests (Playwright, desktop + mobile)
npm run screenshot                      # → screenshots/desktop.png, mobile.png
npm run screenshot -- / arctic 0,80,2   # camera at lng,lat,zoom
npm run screenshot -- --game / game     # game screen (seed 1), first turn started
npm run screenshot -- --handover / ho   # game screen, handover before the first turn
npm run fetch:basemap                   # rebuild the base map from Natural Earth
```

One-time setup for browser tests and screenshots: `npx playwright install chromium`.

Browser tests and screenshots run in headless Chromium with software WebGL (SwiftShader). In the dev server, the MapLibre instance is available to tests as `window.__eingekreist.map`.

## Deployment

Live at https://janiwo.github.io/eingekreist/. The workflow [.github/workflows/pages.yml](.github/workflows/pages.yml) runs unit tests, lint and build on every PR; on `main` it also deploys `dist/` to GitHub Pages. Production builds use the base path `/eingekreist/` (see [vite.config.ts](vite.config.ts)); `npm run preview` serves the build the same way at http://localhost:4173/eingekreist/. The Node version for CI is pinned in `.node-version`.

## Structure

```
src/
  game/types.ts     data model (place, player, circle, settings)
  geo/hitTest.ts    hit test: geodesic distance from circle center to outline
  map/Globe.tsx     MapLibre globe (land, sea, toggleable country borders)
  map/baseData.ts   base map (land, borders) from src/data/basemap/
  map/maplibre.ts   MapLibre import with explicitly bundled worker
  map/view.ts       start view for each turn
  i18n/de.ts, en.ts German and English UI text
  i18n/context.ts   useI18n(): current language and its strings
  ui/categoryTheme.ts category icons and colors
  data/basemap/     Natural Earth 1:10m as compact GeoJSON
e2e/                Playwright tests (*.e2e.ts)
scripts/            screenshot.ts, fetch-basemap.ts
```

Map data: [Natural Earth](https://www.naturalearthdata.com/), public domain.
