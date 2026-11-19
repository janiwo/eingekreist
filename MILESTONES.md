# Milestones

Each milestone is its own PR (see [AGENTS.md](AGENTS.md)). Completed milestones are checked off. Based on [SPEC.md](SPEC.md).

## [x] M0 – Project setup

Vite, React and TypeScript; MapLibre globe with Natural Earth base map; geodesic hit test; Vitest; Playwright; screenshot script; Git and GitHub.

## [ ] M1 – Drawing the circle

A single player can place and adjust a circle on the globe.

- Tapping or clicking sets the center, with a starting radius that fits the current zoom.
- Handles:
  - move the center
  - change the radius
- Works with mouse and touch. Dragging a handle does not rotate the globe.
- The circle is rendered geodesically (a true circle on the sphere, no distortion towards the poles).
- The radius is shown live in km, sensibly rounded. Minimum radius: 1 km.
- Circles across the antimeridian or around a pole render correctly.
- The circle geometry is its own module (circle → GeoJSON polygon).

**Done when:**
- Unit tests for the circle geometry and the minimum radius pass.
- An e2e test places a circle and changes its radius.
- Screenshots of the equator, a pole and the antimeridian are clean.

## [ ] M2 – Place dataset

A build script (`npm run build:places`) generates the curated place dataset from SPEC §4.

- The place list lives as a source file in the repo. Per entry:
  - ID, German name, optional suffix, category
  - source reference (Natural Earth feature, OSM relation, coordinate)
  - optional buffer and excluded parts
- Scope:

  | Category | approx. |
  |---|---|
  | Countries | all ~195 |
  | Cities | ~150 |
  | Islands | ~50 |
  | Landscapes | ~50 |
  | Waters | ~60 |
  | Landmarks | ~80 |

- Sources:
  - Natural Earth: countries, landscapes and regions, seas, lakes, rivers, islands
  - OSM: city boundaries
  - point + buffer: landmarks
  - line + buffer: rivers
- Overseas territories with their own status don't count (e.g. Greenland ≠ Denmark).
- Outliers among city boundaries (e.g. Chongqing) are excluded.
- Simplification ~500 m, rounded coordinates. The output is committed as a generated file.
- The output is validated:
  - valid geometries
  - no empty places
  - count per category
  - file size
- Raw downloads are cached (gitignored) and not committed.
- OSM attribution is prepared in the UI („© OpenStreetMap-Mitwirkende“).
- A debug view in dev mode (e.g. `?debug=places`) shows a place on the globe by name or ID.

**Done when:**
- The dataset is fully generated and the validation script passes.
- Spot-check screenshots are clean: France with Réunion, Russia across the antimeridian, Sahara, a river, a landmark, a city.
- A unit test checks the hit test against real places.

## [ ] M3 – Game setup and game state

- Start screen:
  - add 2–8 players: name, automatically assigned and changeable color
  - settings: target score (10), timer (60 s or off), country borders (on), active categories (all, at least one)
- Game state as a pure, testable state machine (reducer). The UI only depends on it.
- Drawing places:
  - is two-stage: first a category uniformly, then a place from it
  - never repeats a place
  - uses an injectable seed
- Persistence in `localStorage`: a reload continues the game. There is a "New game" button.

**Done when:**
- Unit tests for the reducer and the drawing pass.
- An e2e test creates a game, reloads the page and the state is still there.

## [ ] M4 – Turn flow

- The prompt (category and name) is visible during the turn.
- Handover screen („Gib das Gerät an …“). Globe and timer only appear after tapping.
- The globe is reset to the start view for every turn.
- Timer:
  - If time runs out and a circle is placed, it is submitted automatically. Otherwise the turn counts as "not submitted".
  - If the timer is disabled, no timer is shown.
- "Submit" and "Pass".
- The starting player is the same every round.
- No trace of previous players' circles, neither visible nor in the DOM.

**Done when:**
- An e2e test plays a complete round with 3 players (submit, pass, timeout with a fake timer).

## [ ] M5 – Reveal, scoring, end of game

- Reveal:
  - All circles in player colors, plus the place's outline.
  - The globe flies to the place.
  - Per player: radius and whether they hit.
  - Round winner.
- Scoring:
  - The smallest hitting circle wins.
  - Tie: all tied players get a point.
  - If nobody hits, nobody gets a point.
- Standings, then "Next round".
- The game ends at the target score. Several players reaching it at once → sudden death until one leads alone.
- End screen with ranking and "Play again" (same players) or "New game".

**Done when:**
- Unit tests for scoring, ties, no hits and sudden death pass.
- An e2e test plays a short game (target score 2) to the end.

## [ ] M6 – Polish

- Prompt card with the category's icon and accent color.
- Responsive for smartphone (portrait and landscape), tablet and desktop.
- Larger touch targets, keyboard support, sensible ARIA labels.
- Reduce the app size:
  - individual `@turf/*` packages
  - lazy-load place data
  - target < 1 MB gzip
- Dev panels are removed or only shown in dev mode.
- Attribution (Natural Earth, „© OpenStreetMap-Mitwirkende“).

**Done when:**
- Screenshots of all screens on desktop and mobile have been checked.
- The bundle size is documented in the PR.

## Later (only after approval)

- Hosting and deployment, once the local version is approved
- Provinces
- Online multiplayer
- Satellite map
- Other languages
