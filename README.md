# Eingekreist

Geography party game for 2–8 players on one device: whoever hits the named place with the smallest circle scores. Details in [SPEC.md](SPEC.md), work plan in [MILESTONES.md](MILESTONES.md). The app's UI is German; everything else is English.

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
npm run fetch:basemap                   # re-download the base map from Natural Earth
```

One-time setup for browser tests and screenshots: `npx playwright install chromium`.

Browser tests and screenshots run in headless Chromium with software WebGL (SwiftShader). In the dev server, the MapLibre instance is available to tests as `window.__eingekreist.map`.

## Structure

```
src/
  game/types.ts     data model (place, player, circle, settings)
  geo/hitTest.ts    hit test: geodesic distance from circle center to outline
  map/Globe.tsx     MapLibre globe (land, sea, toggleable country borders)
  map/baseData.ts   base map (land, borders) from src/data/basemap/
  map/maplibre.ts   MapLibre import with explicitly bundled worker
  map/view.ts       start view for each turn
  i18n/de.ts        German UI text and category themes (icon, color)
  data/basemap/     Natural Earth 1:50m as compact GeoJSON
e2e/                Playwright tests (*.e2e.ts)
scripts/            screenshot.ts, fetch-basemap.ts
```

Map data: [Natural Earth](https://www.naturalearthdata.com/), public domain.
