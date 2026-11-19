import { describe, expect, it } from 'vitest'
import type { Place } from '../game/types'
import { findPlace } from './findPlace'

const place = (id: string, name: string): Place => ({
  id,
  name,
  category: 'city',
  geometry: { type: 'Polygon', coordinates: [] },
})

const places = [place('munich', 'München'), place('muenster', 'Münster'), place('malmo', 'Malmö')]

describe('findPlace', () => {
  it('finds by ID', () => {
    expect(findPlace(places, 'malmo')?.id).toBe('malmo')
  })

  it('finds by name, ignoring case and diacritics', () => {
    expect(findPlace(places, 'MÜNSTER')?.id).toBe('muenster')
    expect(findPlace(places, 'Munster')?.id).toBe('muenster')
  })

  it('falls back to a name prefix', () => {
    expect(findPlace(places, 'Mün')?.id).toBe('munich')
  })

  it('finds nothing for an empty or unknown query', () => {
    expect(findPlace(places, ' ')).toBeUndefined()
    expect(findPlace(places, 'Paris')).toBeUndefined()
  })
})
