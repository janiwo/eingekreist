import { lazy, Suspense, useCallback, useEffect, useReducer, useState } from 'react'
import { loadPlaces } from './data/places'
import { poolOf } from './game/draw'
import { loadGame, saveGame } from './game/persistence'
import { randomSeed } from './game/rng'
import { createSetup, gameReducer, type GameState } from './game/state'
import { de } from './i18n/de'
import { Globe } from './map/Globe'
import type { Map as MapLibreMap } from './map/maplibre'
import { GameScreen } from './ui/GameScreen'
import { SetupScreen } from './ui/SetupScreen'

// Dev-only place inspector; the import is dropped from production builds.
const PlaceDebug =
  import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === 'places'
    ? lazy(() => import('./debug/PlaceDebug'))
    : null

const initialState = (): GameState => loadGame() ?? createSetup(de.setup.defaultName)

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState)
  const [map, setMap] = useState<MapLibreMap | null>(null)

  useEffect(() => saveGame(state), [state])

  const startGame = useCallback(async (seed = randomSeed()) => {
    const places = await loadPlaces()
    dispatch({ type: 'start', pool: poolOf(places), seed })
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV && map && window.__eingekreist) window.__eingekreist.startGame = startGame
  }, [map, startGame])

  return (
    <div className="app">
      <Globe showBorders={state.settings.showBorders} onMapReady={setMap} />
      {PlaceDebug ? (
        map && (
          // Not ready until loaded (the screenshot script waits for data-ready).
          <Suspense fallback={<div data-ready="false" hidden />}>
            <PlaceDebug map={map} />
          </Suspense>
        )
      ) : state.phase === 'setup' ? (
        <SetupScreen state={state} dispatch={dispatch} onStart={() => startGame()} />
      ) : (
        <GameScreen
          state={state}
          map={map}
          onNewGame={() => dispatch({ type: 'newGame', defaultName: de.setup.defaultName })}
        />
      )}
    </div>
  )
}
