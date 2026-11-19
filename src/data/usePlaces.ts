import { useEffect, useState } from 'react'
import type { Place } from '../game/types'
import { loadPlaces } from './places'

/** The place dataset, loaded on mount (`null` until it has loaded). */
export function usePlaces(): Place[] | null {
  const [places, setPlaces] = useState<Place[] | null>(null)
  useEffect(() => {
    let alive = true
    loadPlaces()
      .then((p) => alive && setPlaces(p))
      .catch((e: unknown) => console.error(e))
    return () => {
      alive = false
    }
  }, [])
  return places
}
