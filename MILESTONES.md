# Milestones

Each milestone is its own PR (see [AGENTS.md](AGENTS.md)). Completed milestones are checked off. Based on [SPEC.md](SPEC.md).

## [x] M0 – Project setup

Vite, React and TypeScript; MapLibre globe with Natural Earth base map; geodesic hit test; Vitest; Playwright; screenshot script; Git and GitHub.

## [x] M1 – Drawing the circle

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

## [x] M2 – Place dataset

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

## [x] M3 – Game setup and game state

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

## [x] M4 – Turn flow

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

## [x] M5 – Reveal, scoring, end of game

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

## [x] M6 – How to play

An instructions dialog explains the game, so new players understand it without a walkthrough.

- Format: one native modal `<dialog>` (like the "new game" confirmation), scrollable, short headed sections, closes with ✕ or Esc.
- Entry points:
  - start screen: text link „So wird gespielt" below the title
  - game bar: round "?" button next to „Neues Spiel" (aria-label/title „So wird gespielt") on the handover and reveal screens
  - not during a turn (the timer is running), not on the end screen
- No auto-open on first visit.
- Content (German, in `de.ts`, informal „du", ~150–250 words):
  1. Goal: the smallest circle that still touches the place wins the point.
  2. A round: the place is named → pass the device → tap to set the center, drag the handles → „Abgeben" or „Passen" → timer. Secrecy line: „Alle zeichnen geheim. Die Kreise der anderen siehst du erst bei der Auflösung."
  3. Scoring: any touch counts, even the edge; for places with several parts, any part counts; the outline shown at the reveal is the truth; a tie gives everyone a point; no hit, no point. Tip: circles shrink down to 1 km, so go tiny if you're sure.
  4. End: first to the target score wins; players tied on top play sudden death.
- Settings-aware text: the current target score and timer (seconds, or no time limit). No list of categories.
- One inline SVG illustration of the scoring rule: a place outline, a large circle and a small circle touching the edge, the small one marked as the winner. Labels in `de.ts`, colors from CSS tokens.
- SPEC.md gets a short "Instructions" section.

**Done when:**
- A unit test covers the settings-aware text (timer on/off, target score).
- An e2e test opens the dialog from the start screen and closes it with Esc, opens it from the handover, and checks that the button is missing during a turn.
- Screenshots of the open dialog on desktop and mobile have been checked (the screenshot script gets a `--help` option).

## [x] M7 – Polish

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

- [x] Hosting and deployment: GitHub Pages, deployed from `main` by GitHub Actions
- Provinces
- Online multiplayer
- Satellite map
- Other languages
