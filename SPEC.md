# Eingekreist – Specification (version 1)

Last updated: 2026-11-20

## 1. Game concept

- 2–8 players take turns on **one device** (hotseat).
- Each player enters a name at the start and is automatically assigned a color (changeable).
- Each round names a place. Every player **secretly** places a circle of any size on a 3D globe.
- The point goes to whoever overlaps the place's outline with the **smallest circle**.
  - **Any overlap counts**, even a minimal touch of the edge.
  - For places made of several parts, overlapping **any part** counts (e.g. France via Réunion). The dataset defines per place which parts belong to it.
  - Minimum radius: **1 km**.
  - Tie: all tied players get a point.
  - If no circle overlaps the place, nobody gets a point.
- The game runs to a configurable target score (default: **5**).
  - If several players reach the target score in the same round, play continues in **sudden death** until one player leads alone.
    - Only the players tied on top play in sudden death; everyone else is out.
    - After each sudden-death round, whoever is no longer tied on top is out as well (e.g. three tied, two hit with the same radius, one misses → only those two play on).

## 2. Round flow

1. **Prompt**: show the place with its category (e.g. „🏙️ Stadt: Luxemburg“).
2. **Turns**: players go one after another. The starting player is **the same** every round.
   - Before each turn a **handover screen** appears („Gib das Gerät an Anna – Tippen zum Starten“).
   - The globe is reset to the **start view** for every player: whole globe, centered on 20° N / 10° E.
   - The timer starts when the player taps "Start".
3. **Placing the circle**:
   - Tapping or clicking sets the center.
   - Center and radius can be adjusted via handles.
   - The current radius is shown live in km.
   - A button with a target icon next to the radius shrinks the circle to the minimum radius, keeping its center. The globe then zooms in on the center (never out) until the two handles are clearly apart. The button is disabled without a circle and at the minimum radius.
   - "Submit" confirms the circle. There is no "Pass": every player gives their best guess.
4. **Timer**: default 60 seconds per player and turn, configurable and can be disabled.
   - If time runs out and a circle is placed, it is submitted automatically.
   - Without a circle, the turn counts as "not submitted".
5. **Reveal**, after all players have had their turn:
   - All circles appear at once in player colors.
   - The place's outline is shown, and the globe flies to the place.
   - Each player's radius in km is shown, plus the round winner.
   - Then the standings and "Next round".
   - Clicking a player's row in the results flies the globe to their circle, as large as fits above the card (zoom 14 at most, so even 1 km circles show clearly). Rows without a circle are not clickable. Nothing on the globe is highlighted or dimmed.
   - Once the globe has left the place's view (a row was clicked, or the globe was moved by hand), a „📍 <place>“ button appears above the results. It flies back to the place's view and disappears. Its space is always reserved, so the card never shifts.
   - These flights take as long as the zoom of the minimum-radius button (1 s) and interrupt any running flight.
   - A chevron button (▾) collapses the card into a slim bar, so the whole map shows. It is in the card's top right corner, or next to the „📍“ button on short landscape screens. The bar shows the winner line, the „📍 <place>“ button (when the globe has left the place's view), "Next round" and a ▴ button. Tapping anywhere on the bar except its buttons expands the card again. This works on every screen size, and every reveal starts expanded.
   - Collapsing and expanding never move the globe. Flights always keep clear of the expanded card, whether it is open or not, so they land on the same view either way.

### 2.1 Instructions

- A „So wird gespielt“ dialog explains the game, briefly: goal, a round, scoring (with an illustration, and the 1 km minimum radius and its button as a tip), end of the game and sudden death.
- The text is fixed: it doesn't change with the settings (target score, timer).
- It opens from the start screen and from the game bar on the handover and reveal screens. It is not available during a turn (the timer runs) or on the end screen.
- It never opens by itself.

## 3. Settings

| Setting | Default |
|---|---|
| Players (name, color) | 2–8 players |
| Target score | 5 |
| Timer per turn | 60 s, can be disabled |
| Show country borders | on |
| Active categories | all |

## 4. Content

### 4.1 Categories

| Category | Approx. count | Geometry source |
|---|---|---|
| Countries | all ~195 | Natural Earth |
| Cities | ~150 (capitals and major cities) | OSM administrative boundaries |
| Islands | ~50 | Natural Earth |
| Landscapes (deserts, mountain ranges, plains …) | ~50 | Natural Earth (geography regions) |
| Waters (seas, lakes, rivers) | ~60 | Natural Earth |
| Landmarks | ~125 | point + buffer; long structures (Great Wall) as buffered OSM lines |

- Provinces and states are **not** part of version 1.
- Selection principle: a generally educated person should have heard of every place.
- There are **no difficulty levels**.

### 4.2 Drawing places

- Two-stage: first one of the active categories is drawn uniformly, then a place from that category.
- Each place appears at most once per game.

### 4.3 Geometry rules

- **Cities**: OSM administrative boundary. Outliers with absurd extent (e.g. Chongqing) are excluded.
- **Points and lines** (landmarks, rivers): get a **buffer zone** whose size is set per place in the dataset.
- **Fuzzy places** (Sahara, Alps, Mediterranean …): the Natural Earth outline counts as the truth. It is shown during the reveal.
- **Disputed territories**: Natural Earth's de facto view.
- **Overseas territories** with their own status (e.g. Greenland for Denmark) don't count toward the mother country.
- **Simplification**: tolerance ~500 m.

### 4.4 Naming

- Languages: German and English, for the UI and the place names (e.g. „Elfenbeinküste“ / "Ivory Coast", „Mailand“ / "Milan"). English names are the most common English name, with the English Wikipedia title as the fallback.
  - The app starts in German if the browser's preferred language is German (`de`, `de-AT` …), otherwise in English.
  - A "DE | EN" switch on the start screen and in the instructions changes it. The choice is remembered on the device.
  - The app name stays „Eingekreist“, distances stay in km, and default player names are "Player 1", "Player 2" … in both languages.
  - The place pool is the same in both languages.
- The prompt always shows the category. If a name is ambiguous within a category, a suffix is added.

### 4.5 Dataset

- Curated, **static** dataset shipped with the app. No external services are queried at runtime.
- Stored per place:
  - ID
  - name in every language (German, English)
  - optional name suffix
  - category
  - geometry (simplified, buffer already applied)
- The curated list stores per place the source reference (Natural Earth feature, OSM relation, coordinate), the optional buffer size and excluded parts; the build script applies them.
- A **build script** fetches the geometries from Natural Earth and OSM and generates the dataset.
- The initial list is proposed by Claude and maintained manually afterwards.
- Every place must be **visible on the globe**: the globe is drawn from the same Natural Earth 1:10m data and simplification as the places. A place on land must touch drawn land; a sea or strait must be one coherent shape, not slivers. Entries whose source data fails this are **left out**, not patched by hand.

## 5. Presentation

- **3D globe** with a plain, self-rendered style from Natural Earth data: land, sea, optional country borders. **No labels.**
- The globe style is the same for all categories, so it gives no hints.
- **Category theme**: only the prompt card gets the category's icon and accent color (e.g. 🌊 waters in blue, 🏜️ landscapes in sand).
- Responsive for desktop, tablet and smartphone, with full touch support.
- Playable with the keyboard: Enter on the focused globe places the circle at the center of the view, the arrow keys move the center handle or change the radius on the radius handle.
- The map data credits (Natural Earth, „© OpenStreetMap-Mitwirkende“ / "© OpenStreetMap contributors") are shown on the map and on the start screen.

## 6. Technology

- Static web app **without a backend**: TypeScript, React (Vite), MapLibre GL JS in globe mode, Turf.js.
- Hosting as a static site on GitHub Pages (https://janiwo.github.io/eingekreist/), deployed automatically from `main`.
- **Analytics**: cookieless visitor statistics with GoatCounter (https://eingekreist.goatcounter.com/), on the live site only. Besides page views it counts two events, each ending in the UI language: `game-started/<n>-players/<de|en>` and `game-finished/<n>-rounds/<de|en>`. No consent banner and no privacy note yet; both may come later.
- **Circle size**: true radius on the Earth's surface in km. The circle is rendered as a geodesic circle.
- **Hit test**: a circle hits if and only if
  - the center lies inside the place **or**
  - the geodesic distance from the center to the nearest point of the outline is ≤ the radius.
- **Persistence**: the game state is stored in `localStorage`. After a reload, the running game continues.

## 7. Not in version 1

- Online multiplayer (own devices, room code)
- Provinces and states
- Satellite map
- Difficulty levels
- Showing the "required" radius during the reveal
- Accounts and monetization
- Languages other than German and English
