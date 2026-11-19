# Eingekreist

Geografie-Partyspiel für 2–8 Spieler an einem Gerät: Wer den gesuchten Ort mit dem kleinsten Kreis trifft, bekommt den Punkt. Details stehen in [SPEC.md](SPEC.md).

## Entwicklung

```sh
npm install
npm run dev      # Dev-Server
npm test         # Unit-Tests (Vitest)
npm run lint     # oxlint
npm run build    # Typecheck + Produktions-Build nach dist/
npm run e2e      # Browser-Tests (Playwright, Desktop + Mobile)
npm run screenshot                     # → screenshots/desktop.png, mobile.png
npm run screenshot -- / arktis 0,80,2  # Kamera auf Länge,Breite,Zoom
npm run fetch:basemap                  # Basiskarte neu von Natural Earth laden
```

Einmalig für Browser-Tests und Screenshots: `npx playwright install chromium`.

Browser-Tests und Screenshots laufen in headless Chromium mit Software-WebGL (SwiftShader).
Im Dev-Server ist die MapLibre-Instanz für Tests unter `window.__eingekreist.map` erreichbar.

## Struktur

```
src/
  game/types.ts     Datenmodell (Ort, Spieler, Kreis, Einstellungen)
  geo/hitTest.ts    Trefferprüfung: geodätischer Abstand Kreismittelpunkt → Umriss
  map/Globe.tsx     MapLibre-Globus (Land, Meer, Ländergrenzen ein-/ausblendbar)
  map/baseData.ts   Basiskarte (Land, Grenzen) aus src/data/basemap/
  map/maplibre.ts   MapLibre-Import mit fest eingebundenem Worker
  map/view.ts       Startansicht pro Zug
  i18n/de.ts        Deutsche Texte und Kategorie-Themes (Icon, Farbe)
  data/basemap/     Natural Earth 1:50m als kompaktes GeoJSON
e2e/                Playwright-Tests (*.e2e.ts)
scripts/            screenshot.ts, fetch-basemap.ts
```

Kartendaten: [Natural Earth](https://www.naturalearthdata.com/), gemeinfrei.
