import type { Strings } from '../i18n/de'

/** Map data sources, credited on the map and the start screen. OSM requires it (ODbL). */
export const dataSources = (t: Strings) => [
  { name: t.credits.naturalEarth, href: 'https://www.naturalearthdata.com' },
  { name: t.credits.osm, href: 'https://www.openstreetmap.org/copyright' },
]

/** The credits as HTML links, for the map's attribution control. */
export const attributionHtml = (t: Strings) =>
  dataSources(t).map((s) => `<a href="${s.href}" target="_blank" rel="noopener">${s.name}</a>`)
