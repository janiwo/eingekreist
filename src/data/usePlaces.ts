import { useCallback, useEffect, useState } from 'react'
import type { Place } from '../game/types'
import { loadPlaces } from './places'

export interface PlacesState {
  /** `null` until loaded. */
  places: Place[] | null
  /** Whether the last attempt to load failed. */
  failed: boolean
  /** (Re)loads the dataset (cached after the first success) and resolves with it. */
  load: () => Promise<Place[]>
}

/** The place dataset, loaded on mount and reloadable after a failure. */
export function usePlaces(): PlacesState {
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const p = await loadPlaces()
      setPlaces(p)
      setFailed(false)
      return p
    } catch (e) {
      setFailed(true)
      throw e
    }
  }, [])

  useEffect(() => {
    loadPlaces().then(setPlaces, (e: unknown) => {
      console.warn(e)
      setFailed(true)
    })
  }, [])

  return { places, failed, load }
}
