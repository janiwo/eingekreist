# Eingekreist – Spezifikation (Version 1)

Stand: 2026-11-19

## 1. Spielprinzip

- 2–8 Spieler spielen reihum auf **einem Gerät** (Hotseat).
- Jeder Spieler gibt beim Start einen Namen ein und bekommt automatisch eine Farbe zugewiesen (änderbar).
- In jeder Runde wird ein Ort genannt. Jeder Spieler setzt **verdeckt** einen Kreis beliebiger Größe auf einen 3D-Globus.
- Den Punkt bekommt, wer mit dem **kleinsten Kreis** den Umriss des Ortes überlappt.
  - **Jede Überlappung zählt**, auch eine minimale Berührung des Randes.
  - Bei mehrteiligen Orten zählt die Überlappung mit **irgendeinem Teil** (z. B. Frankreich über Réunion). Welche Teile zu einem Ort gehören, legt der Datensatz pro Ort fest.
  - Mindestradius: **1 km**.
  - Gleichstand: Alle Gleichstehenden bekommen einen Punkt.
  - Überlappt kein Kreis den Ort, bekommt niemand einen Punkt.
- Das Spiel geht bis zu einer einstellbaren Zielpunktzahl (Standard: **10**).
  - Erreichen mehrere Spieler die Zielpunktzahl in derselben Runde, wird im **Sudden Death** weitergespielt, bis ein Spieler allein führt.

## 2. Rundenablauf

1. **Aufgabe**: Ort mit Kategorie anzeigen (z. B. „🏙️ Stadt: Luxemburg“).
2. **Züge**: Die Spieler sind nacheinander dran. Der Startspieler ist in jeder Runde **derselbe**.
   - Vor jedem Zug erscheint ein **Übergabebildschirm** („Gib das Gerät an Anna – Tippen zum Starten“).
   - Der Globus wird für jeden Spieler auf die **Startansicht** zurückgesetzt: ganzer Globus, zentriert auf 20° N / 10° O.
   - Der Timer startet mit dem Tippen auf „Start“.
3. **Kreis setzen**:
   - Tippen bzw. Klicken setzt den Mittelpunkt.
   - Mittelpunkt und Radius lassen sich über Griffe anpassen.
   - Der aktuelle Radius wird live in km angezeigt.
   - „Abgeben“ bestätigt den Kreis, „Passen“ gibt ohne Kreis ab.
4. **Timer**: Standard 60 Sekunden pro Spieler und Zug, einstellbar und deaktivierbar.
   - Läuft die Zeit ab und ein Kreis ist gesetzt, wird er automatisch abgegeben.
   - Ohne Kreis gilt der Zug als „nicht abgegeben“.
5. **Auflösung**, nachdem alle Spieler dran waren:
   - Alle Kreise erscheinen gleichzeitig in Spielerfarben.
   - Der Umriss des Ortes wird angezeigt, und der Globus fliegt zum Ort.
   - Pro Spieler wird der Radius in km angezeigt, außerdem der Rundensieger.
   - Danach folgen Zwischenstand und „Nächste Runde“.

## 3. Einstellungen

| Einstellung | Standard |
|---|---|
| Spieler (Name, Farbe) | 2–8 Spieler |
| Zielpunktzahl | 10 |
| Timer pro Zug | 60 s, deaktivierbar |
| Ländergrenzen anzeigen | an |
| Aktive Kategorien | alle |

## 4. Inhalte

### 4.1 Kategorien

| Kategorie | Umfang (ca.) | Geometriequelle |
|---|---|---|
| Länder | alle ~195 | Natural Earth |
| Städte | ~150 (Hauptstädte und Großstädte) | OSM-Verwaltungsgrenzen |
| Inseln | ~50 | Natural Earth |
| Landschaften (Wüsten, Gebirge, Ebenen …) | ~50 | Natural Earth (geography regions) |
| Gewässer (Meere, Seen, Flüsse) | ~60 | Natural Earth |
| Sehenswürdigkeiten | ~80 | Punkt + Puffer |

- Provinzen bzw. Bundesländer sind in Version 1 **nicht** enthalten.
- Auswahlgrundsatz: Ein allgemein gebildeter Mensch sollte von jedem Ort schon gehört haben.
- Es gibt **keine Schwierigkeitsstufen**.

### 4.2 Ziehung

- Zweistufig: Zuerst wird eine der aktiven Kategorien gleichverteilt gezogen, dann ein Ort aus dieser Kategorie.
- Jeder Ort kommt pro Spiel höchstens einmal vor.

### 4.3 Geometrie-Regeln

- **Städte**: OSM-Verwaltungsgrenze. Ausreißer mit absurder Ausdehnung (z. B. Chongqing) werden nicht aufgenommen.
- **Punkte und Linien** (Sehenswürdigkeiten, Flüsse): Sie bekommen eine **Pufferzone**, deren Größe pro Ort im Datensatz steht.
- **Unscharfe Orte** (Sahara, Alpen, Mittelmeer …): Der Natural-Earth-Umriss gilt als Wahrheit. Bei der Auflösung wird er angezeigt.
- **Umstrittene Gebiete**: De-facto-Sicht von Natural Earth.
- **Überseegebiete** mit eigenem Status (z. B. Grönland bei Dänemark) zählen nicht zum Mutterland.
- **Vereinfachung**: Toleranz ~500 m.

### 4.4 Benennung

- Sprache: nur Deutsch (z. B. „Elfenbeinküste“, „Mailand“). Die Texte liegen so, dass später weitere Sprachen ergänzt werden können.
- Die Aufgabe zeigt immer die Kategorie an. Bei Mehrdeutigkeit innerhalb einer Kategorie kommt ein Zusatz dazu.

### 4.5 Datensatz

- Kuratierter, **statischer** Datensatz, der mit der App ausgeliefert wird. Zur Laufzeit gibt es keine Abfragen externer Dienste.
- Pro Ort werden gespeichert:
  - ID
  - deutscher Name
  - optionaler Namenszusatz
  - Kategorie
  - Geometrie (vereinfachtes GeoJSON)
  - optional die Puffergröße
- Ein **Build-Skript** holt die Geometrien aus Natural Earth und OSM und erzeugt den Datensatz.
- Die Startliste wird vorgeschlagen und danach manuell gepflegt.

## 5. Darstellung

- **3D-Globus** mit schlichtem, selbst gerendertem Stil aus Natural-Earth-Daten: Land, Meer, optional Ländergrenzen. **Keine Beschriftungen.**
- Der Globus-Stil ist für alle Kategorien gleich, damit er keine Hinweise gibt.
- **Kategorie-Theme**: Nur die Aufgabenkarte bekommt Icon und Akzentfarbe der Kategorie (z. B. 🌊 Gewässer in Blau, 🏜️ Landschaft in Sandfarbe).
- Responsive für Desktop, Tablet und Smartphone, mit voller Touch-Bedienung.

## 6. Technik

- Statische Web-App **ohne Backend**: TypeScript, React (Vite), MapLibre GL JS im Globus-Modus, Turf.js.
- Hosting als statische Seite (GitHub Pages oder Netlify).
- **Kreisgröße**: echter Radius auf der Erdkugel in km. Der Kreis wird als geodätischer Kreis dargestellt.
- **Trefferprüfung**: Ein Kreis trifft genau dann, wenn
  - der Mittelpunkt im Ort liegt **oder**
  - der geodätische Abstand vom Mittelpunkt zum nächsten Punkt des Umrisses ≤ Radius ist.
- **Persistenz**: Der Spielstand liegt im `localStorage`. Nach einem Reload wird das laufende Spiel fortgesetzt.

## 7. Nicht in Version 1

- Online-Multiplayer (eigene Geräte, Raum-Code)
- Provinzen und Bundesländer
- Satellitenkarte
- Schwierigkeitsstufen
- Anzeige des „nötigen“ Radius bei der Auflösung
- Accounts und Monetarisierung
- Weitere Sprachen
