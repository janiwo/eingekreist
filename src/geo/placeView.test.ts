import type { MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { placeBounds, placeOutline } from './placeView'

const square: Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
}

// An area cut at the antimeridian into an eastern and a western part
const acrossSeam: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [[[170, 60], [180, 60], [180, 70], [170, 70], [170, 60]]],
    [[[-180, 60], [-170, 60], [-170, 70], [-180, 70], [-180, 60]]],
  ],
}

describe('placeOutline', () => {
  it('keeps an ordinary ring whole', () => {
    expect(placeOutline(square).coordinates).toEqual(square.coordinates)
  })

  it('leaves out the edges along the antimeridian', () => {
    expect(placeOutline(acrossSeam).coordinates).toEqual([
      [[170, 60], [180, 60]],
      [[180, 70], [170, 70], [170, 60]],
      [[-180, 60], [-170, 60], [-170, 70], [-180, 70]],
    ])
  })
})

describe('placeBounds', () => {
  it('is the plain bounding box for ordinary places', () => {
    expect(placeBounds(square)).toEqual([0, 0, 1, 1])
  })

  it('runs across the antimeridian when that is narrower', () => {
    expect(placeBounds(acrossSeam)).toEqual([170, 60, 190, 70])
  })
})
