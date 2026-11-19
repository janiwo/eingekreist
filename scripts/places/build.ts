/**
 * Generates the place dataset src/data/places.json from the curated list in scripts/places/list/.
 * Raw downloads are cached in .cache/places/; delete that folder to refetch.
 *
 *   npm run build:places
 */
import { writeFileSync } from 'node:fs'
import type { Feature, Geometry, Position } from 'geojson'
import { booleanPointInPolygon } from '@turf/turf'
import type { Place } from '../../src/game/types.ts'
import {
  bufferLines,
  bufferPoint,
  excludeParts,
  finalize,
  inBBox,
  polygonsOf,
  simplifyLines,
  simplifyPolys,
  toGeometry,
  type Polys,
} from './geometry.ts'
import { placeSources } from './list/index.ts'
import { naturalEarth, osmBoundaries, type NeLayer } from './sources.ts'
import type { BBox, PlaceSource, Source } from './types.ts'
import { formatReport, PLACES_FILE, serializePlaces, validatePlaces } from './validate.ts'

type Raw = { polys: Polys } | { lines: Position[][] }

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

/** Features of a layer whose name property matches; every name must match at least once. */
async function byName(name: NeLayer, prop: string, names: string[], where = (_f: Feature) => true) {
  const features = (await layer(name)).filter((f) => where(f))
  return names.flatMap((n) => {
    const hits = features.filter((f) => f.properties?.[prop] === n)
    if (hits.length === 0) throw new Error(`ne_10m_${name}: no feature with ${prop} = "${n}"`)
    return hits
  })
}

let landIndex: { poly: Position[][]; bbox: BBox }[] | undefined
async function landPolygons() {
  if (!landIndex) {
    const polys = [...areaParts(await layer('land')), ...areaParts(await layer('minor_islands'))]
    landIndex = polys.map((poly) => {
      const lngs = poly[0].map((p) => p[0])
      const lats = poly[0].map((p) => p[1])
      const bbox: BBox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
      return { poly, bbox }
    })
  }
  return landIndex
}

const firstVertex = (g: Geometry): Position | undefined =>
  g.type === 'LineString' ? g.coordinates[0] : g.type === 'MultiLineString' ? g.coordinates[0]?.[0] : undefined

async function resolve(source: Source, osm: Map<number, Geometry>): Promise<Raw> {
  switch (source.kind) {
    case 'country':
      return { polys: areaParts(await byName('admin_0_countries', 'ADM0_A3', source.codes)) }
    case 'region':
      return { polys: areaParts(await byName('geography_regions_polys', 'NAME', source.names)) }
    case 'marine':
      return { polys: areaParts(await byName('geography_marine_polys', 'name', source.names)) }
    case 'lake':
      return { polys: areaParts(await byName('lakes', 'name', source.names)) }
    case 'river': {
      const { bbox } = source
      const inBox = (f: Feature) => {
        const v = f.geometry && firstVertex(f.geometry)
        return !!v && (!bbox || inBBox(v, bbox))
      }
      const features = await byName('rivers_lake_centerlines', 'name', source.names, inBox)
      const lines = features.flatMap((f) =>
        f.geometry.type === 'LineString'
          ? [f.geometry.coordinates]
          : f.geometry.type === 'MultiLineString'
            ? f.geometry.coordinates
            : [],
      )
      return { lines: lines.filter((l) => l.length > 1) }
    }
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
      return { polys: [...found] }
    }
    case 'landIn': {
      const [w, s, e, n] = source.bbox
      const land = await landPolygons()
      const polys = land
        .filter(({ bbox: b }) => b[0] >= w && b[1] >= s && b[2] <= e && b[3] <= n)
        .map(({ poly }) => poly)
      if (polys.length === 0) throw new Error(`no land polygons inside ${source.bbox.join(',')}`)
      return { polys }
    }
    case 'osm':
      return {
        polys: source.relations.flatMap((id) => {
          const g = osm.get(id)
          if (g?.type !== 'Polygon' && g?.type !== 'MultiPolygon') throw new Error(`OSM relation ${id} missing`)
          return polygonsOf(g)
        }),
      }
    case 'point':
      return { polys: [] }
  }
}

async function buildPlace(src: PlaceSource, osm: Map<number, Geometry>): Promise<Place> {
  const { source, bufferKm } = src
  const needsBuffer = source.kind === 'point' || source.kind === 'river'
  if (needsBuffer !== (bufferKm !== undefined)) {
    throw new Error(`bufferKm is ${needsBuffer ? 'required' : 'only allowed'} for points and rivers`)
  }

  let polys: Polys
  if (source.kind === 'point') {
    polys = bufferPoint(source.at, bufferKm!)
  } else {
    const raw = await resolve(source, osm)
    polys =
      'lines' in raw
        ? bufferLines(simplifyLines(raw.lines), bufferKm!)
        : simplifyPolys(excludeParts(raw.polys, src.exclude))
  }
  polys = finalize(polys)
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
writeFileSync(PLACES_FILE, json)
console.log(`✓ ${PLACES_FILE}`)

const report = validatePlaces(places, json)
console.log(formatReport(report))
if (report.errors.length > 0) process.exit(1)
