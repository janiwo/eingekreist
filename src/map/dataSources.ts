import { de } from '../i18n/de'

/** Map data sources, credited on the map and the start screen. OSM requires it (ODbL). */
export const DATA_SOURCES = [
  { name: de.credits.naturalEarth, href: 'https://www.naturalearthdata.com' },
  { name: de.credits.osm, href: 'https://www.openstreetmap.org/copyright' },
]

/** The credits as HTML links, for the map's attribution control. */
export const attributionHtml = DATA_SOURCES.map(
  (s) => `<a href="${s.href}" target="_blank" rel="noopener">${s.name}</a>`,
)
