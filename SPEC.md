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
- The game runs to a configurable target score (default: **10**).
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
   - "Submit" confirms the circle, "Pass" ends the turn without a circle.
4. **Timer**: default 60 seconds per player and turn, configurable and can be disabled.
   - If time runs out and a circle is placed, it is submitted automatically.
   - Without a circle, the turn counts as "not submitted".
5. **Reveal**, after all players have had their turn:
   - All circles appear at once in player colors.
   - The place's outline is shown, and the globe flies to the place.
   - Each player's radius in km is shown, plus the round winner.
   - Then the standings and "Next round".

### 2.1 Instructions

- A „So wird gespielt“ dialog explains the game: goal, a round, scoring (including the 1 km minimum radius and its button as a tip), end of the game and sudden death.
- The text follows the current settings (target score, timer or no time limit).
- It opens from the start screen and from the game bar on the handover and reveal screens. It is not available during a turn (the timer runs) or on the end screen.
- It never opens by itself.

## 3. Settings

| Setting | Default |
|---|---|
| Players (name, color) | 2–8 players |
| Target score | 10 |
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
| Landmarks | ~80 | point + buffer; long structures (Great Wall) as buffered OSM lines |

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

- Language: the UI and place names are German only (e.g. „Elfenbeinküste“, „Mailand“). Texts are kept so that more languages can be added later.
- The prompt always shows the category. If a name is ambiguous within a category, a suffix is added.

### 4.5 Dataset

- Curated, **static** dataset shipped with the app. No external services are queried at runtime.
- Stored per place:
  - ID
  - German name
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
- The map data credits (Natural Earth, „© OpenStreetMap-Mitwirkende“) are shown on the map and on the start screen.

## 6. Technology

- Static web app **without a backend**: TypeScript, React (Vite), MapLibre GL JS in globe mode, Turf.js.
- Hosting as a static site on GitHub Pages (https://janiwo.github.io/eingekreist/), deployed automatically from `main`.
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
- Other languages
