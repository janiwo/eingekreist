/**
 * Generates the place dataset src/data/places.json from the curated list in scripts/places/list/.
 * Raw downloads are cached in .cache/places/; delete that folder to refetch.
 *
 *   npm run build:places
 */
import { writeFileSync } from 'node:fs'
import type { Feature, Geometry, MultiPolygon, Polygon, Position } from 'geojson'
import { bbox } from '@turf/bbox'
import { bboxClip } from '@turf/bbox-clip'
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon'
import type { Place } from '../../src/game/types.ts'
import {
  bufferLines,
  bufferPoint,
  excludeParts,
  finalize,
  inBBox,
  intersect,
  polygonsOf,
  simplifyLines,
  simplifyPolys,
  toGeometry,
  union,
  type Polys,
} from './geometry.ts'
import { placeSources } from './list/index.ts'
import { PLACES_FILE, serializePlaces } from './output.ts'
import { CACHE_DIR, naturalEarth, osmBoundaries, type NeLayer } from './sources.ts'
import type { BBox, PlaceSource, Source } from './types.ts'
import { formatReport, validatePlaces } from './validate.ts'

type OsmAreas = Map<number, Polygon | MultiPolygon>
type AreaSource = Exclude<Source, { kind: 'point' | 'river' }>

const layers = new Map<NeLayer, Feature<Geometry>[]>()
async function layer(name: NeLayer) {
  if (!layers.has(name)) layers.set(name, (await naturalEarth(name)).features)
  return layers.get(name)!
}

function areaParts(features: Feature<Geometry>[]): Polys {
  return features.flatMap((f) =>
    f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon' ? polygonsOf(f.geometry) : [],
  )
}

const linesOf = (g: Geometry | null): Position[][] =>
  g?.type === 'LineString' ? [g.coordinates] : g?.type === 'MultiLineString' ? g.coordinates : []

/** Features of a layer whose name property matches; every name must match at least once. */
async function byName(name: NeLayer, prop: string, names: string[], where?: (f: Feature) => boolean) {
  const all = await layer(name)
  const features = where ? all.filter(where) : all
  return names.flatMap((n) => {
    const hits = features.filter((f) => f.properties?.[prop] === n)
    if (hits.length === 0) throw new Error(`ne_10m_${name}: no feature with ${prop} = "${n}"`)
    return hits
  })
}

let landIndex: { poly: Position[][]; bbox: BBox }[] | undefined
async function landPolygons() {
  landIndex ??= [...areaParts(await layer('land')), ...areaParts(await layer('minor_islands'))].map((poly) => ({
    poly,
    bbox: bbox({ type: 'Polygon', coordinates: poly }) as BBox,
  }))
  return landIndex
}

/** Natural Earth land, cut to the box (cheap), for clipping areas to land. */
async function landWithin(box: BBox): Promise<Polys> {
  const [w, s, e, n] = box
  return (await landPolygons())
    .filter(({ bbox: b }) => b[0] <= e && b[2] >= w && b[1] <= n && b[3] >= s)
    .flatMap(({ poly, bbox: b }) =>
      b[0] >= w && b[2] <= e && b[1] >= s && b[3] <= n
        ? [poly]
        : polygonsOf(bboxClip({ type: 'Polygon', coordinates: poly }, box).geometry as Polygon | MultiPolygon),
    )
    .filter((p) => p[0]?.length >= 4)
}

async function riverLines({ names, bbox }: Extract<Source, { kind: 'river' }>): Promise<Position[][]> {
  const inBox = (f: Feature) => {
    const v = linesOf(f.geometry)[0]?.[0]
    return !!v && (!bbox || inBBox(v, bbox))
  }
  const features = await byName('rivers_lake_centerlines', 'name', names, inBox)
  return features.flatMap((f) => linesOf(f.geometry)).filter((l) => l.length > 1)
}

async function areaPolys(source: AreaSource, osm: OsmAreas): Promise<Polys> {
  switch (source.kind) {
    case 'country':
      return areaParts(await byName('admin_0_countries', 'ADM0_A3', source.codes))
    case 'region':
      return areaParts(await byName('geography_regions_polys', 'NAME', source.names))
    case 'marine':
      return areaParts(await byName('geography_marine_polys', 'name', source.names))
    case 'lake':
      return areaParts(await byName('lakes', 'name', source.names))
    case 'land': {
      const land = await landPolygons()
      const found = new Set<Position[][]>()
      for (const pt of source.at) {
        const hit = land.find(
          ({ poly, bbox }) => inBBox(pt, bbox) && booleanPointInPolygon(pt, { type: 'Polygon', coordinates: poly }),
        )
        if (!hit) throw new Error(`no land polygon at ${pt.join(',')}`)
        found.add(hit.poly)
      }
      return [...found]
    }
    case 'landIn': {
      const [w, s, e, n] = source.bbox
      const polys = (await landPolygons())
        .filter(({ bbox: b }) => b[0] >= w && b[1] >= s && b[2] <= e && b[3] <= n)
        .map(({ poly }) => poly)
      if (polys.length === 0) throw new Error(`no land polygons inside ${source.bbox.join(',')}`)
      return polys
    }
    case 'osm': {
      const polys = source.relations.flatMap((id) => {
        const g = osm.get(id)
        if (!g) throw new Error(`OSM relation ${id} missing`)
        return polygonsOf(g)
      })
      // Administrative boundaries often reach far into the sea (Jakarta, Auckland, Hong Kong);
      // only the land counts.
      return intersect(union(polys), await landWithin(bbox(toGeometry(polys)) as BBox))
    }
  }
}

async function placePolys(src: PlaceSource, osm: OsmAreas): Promise<Polys> {
  const { source } = src
  switch (source.kind) {
    case 'point':
      return bufferPoint(source.at, source.bufferKm)
    case 'river':
      return bufferLines(simplifyLines(await riverLines(source)), source.bufferKm)
    default:
      // Merge before simplifying, so edges shared by neighbouring source features
      // (e.g. the seas that make up the Mediterranean) stay together.
      return simplifyPolys(union(excludeParts(await areaPolys(source, osm), src.exclude)))
  }
}

async function buildPlace(src: PlaceSource, osm: OsmAreas): Promise<Place> {
  const polys = finalize(await placePolys(src, osm))
  if (polys.length === 0) throw new Error('empty geometry')
  return {
    id: src.id,
    name: src.name,
    ...(src.qualifier && { qualifier: src.qualifier }),
    category: src.category,
    geometry: toGeometry(polys),
  }
}

const relations = placeSources.flatMap((p) => (p.source.kind === 'osm' ? p.source.relations : []))
const osm = await osmBoundaries(relations)

const places: Place[] = []
const failures: string[] = []
for (const src of placeSources) {
  try {
    places.push(await buildPlace(src, osm))
  } catch (e) {
    failures.push(`${src.id}: ${(e as Error).message}`)
  }
}
if (failures.length > 0) {
  console.error(`✗ ${failures.length} places failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}

const json = serializePlaces(places)
const report = validatePlaces(places, json)
console.log(formatReport(report))
// An invalid dataset goes to the cache for inspection, never into the source tree.
const out = report.errors.length === 0 ? PLACES_FILE : `${CACHE_DIR}/places.invalid.json`
writeFileSync(out, json)
console.log(`${report.errors.length === 0 ? '✓' : '✗'} ${out}`)
if (report.errors.length > 0) process.exit(1)
