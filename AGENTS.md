# Eingekreist – working agreement for coding agents

Hotseat geography game: players draw circles on a 3D globe, the smallest circle touching the target place scores. Product spec: [SPEC.md](SPEC.md). Work plan: [MILESTONES.md](MILESTONES.md).

## Language

- **Everything is in English**: docs, code, comments, test names, commit messages, branch names, PR titles and descriptions.
- **Only exception: the app's UI text, in German and English.** It lives exclusively in `src/i18n/de.ts` and `src/i18n/en.ts` (same keys, typed as `Strings`), never inline. Components read it through `useI18n()`. Text that is the same in every language by design is the exception: default player names („Player 1“, `src/game/state.ts`) and each language's own name in the switch (`src/i18n/locale.ts`). Place names come with every language from the place data; English names live in `scripts/places/list/en.ts`.

## How we work

- **One milestone at a time, one PR per milestone.** Only start a milestone when the user asks. When it's done, open the PR, mark it `[x]` in MILESTONES.md and stop. Don't start the next one on your own.
- **SPEC.md is binding.** If the spec doesn't cover something, choose a sensible default and note it in the PR description under "Decisions". Don't stop to ask.
- **Ask only real product decisions**: game rules, content, look and feel, anything public or costly. Collect questions and ask them together. While waiting, keep working on whatever doesn't depend on the answer.
- **No hosting or deployment** until the user explicitly approves it.
- **Place list**: build and maintain it yourself. No review by the user is needed.
- If the spec changes during a milestone, update SPEC.md in the same PR.
- **Claude Code**: run milestones through the `/milestone` skill (`.claude/skills/milestone/`). A PostToolUse hook (`.claude/hooks/check-ts.sh`) typechecks and lints after every TS edit. Project permissions live in `.claude/settings.json`, which forbids `gh pr merge` and force-pushes.

## Git

- Branch per milestone: `m<N>-<short-name>` (e.g. `m1-circle`), cut from an up-to-date `main`. If the previous milestone's PR is not merged yet, branch from that branch and set it as the PR base (stacked PR). Say so in the PR description.
- Small commits with clear messages. Push regularly.
- PR via `gh pr create`. Title: `M<N>: <Title>`. Body sections:
  - What: what was built
  - Decisions: defaults chosen where the spec was silent
  - How to test: `npm run dev`, plus what to click
  - Screenshots: describe them. They aren't committed.
  - Open points: anything left open
- Never force-push `main`, never merge your own PRs.

## Definition of done (every milestone)

All of the following must pass before the PR is opened:

```sh
npm test          # Vitest unit tests
npm run e2e       # Playwright, desktop + mobile
npm run lint
npm run build
```

- **Look at the result.** Run `npm run screenshot` (start screen; `-- --game / name` for the game screen, `-- --handover / name` for the handover screen, plus `lng,lat,zoom` for a camera view) and inspect the PNGs in `screenshots/`, for both desktop and mobile. After geometry changes, also check polar and antimeridian views.
- New logic gets unit tests. New user flows get at least one e2e test.
- No console errors in the browser (the e2e helper `openGlobe` checks this).

## Conventions

- **Geometry**: GeoJSON `[lng, lat]` throughout. Distances in km on the sphere. Hit test lives in `src/geo/hitTest.ts`.
- **MapLibre**: import from `src/map/maplibre.ts`, never from `maplibre-gl` directly, because of the worker setup. In dev, the map is exposed as `window.__eingekreist.map` for tests.
- **Generated data**: don't edit it by hand. Change the script that generates it and re-run that.
  - `src/data/basemap/`: `npm run fetch:basemap`
  - place data: its build script (see M2)
  - app icons in `public/` (favicon, apple-touch-icon, manifest icons): `npm run build:icons`
- **External data sources**: Natural Earth (public domain) and OpenStreetMap (ODbL, attribution required in the UI). Respect the usage policies (rate limits, generic User-Agent without personal data).
- **Randomness**: game logic must accept an injectable RNG/seed, so tests are deterministic.
- **Dependencies**: keep them few. Prefer individual `@turf/*` packages over the full `@turf/turf`.

## Gotchas

- `maplibre-gl.css` sets `position: relative` on the map container. Size the container explicitly.
- `world-atlas`/TopoJSON data causes artifacts on the MapLibre globe. Use planar Natural Earth GeoJSON instead.
- Headless Chromium needs SwiftShader flags for WebGL (`webglArgs` in `playwright.config.ts`).
