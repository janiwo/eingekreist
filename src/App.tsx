import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { usePlaces } from './data/usePlaces'
import { poolOf } from './game/draw'
import { loadGame, saveGame } from './game/persistence'
import { randomSeed } from './game/rng'
import { createGameReducer, createSetup, playerOnTurn, type GameState } from './game/state'
import type { Settings } from './game/types'
import { de } from './i18n/de'
import { Globe } from './map/Globe'
import type { Map as MapLibreMap } from './map/maplibre'
import { EndScreen } from './ui/EndScreen'
import { GameScreen } from './ui/GameScreen'
import { SetupScreen } from './ui/SetupScreen'

// Dev-only place inspector; the import is dropped from production builds.
const PlaceDebug =
  import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === 'places'
    ? lazy(() => import('./debug/PlaceDebug'))
    : null

const gameReducer = createGameReducer(de.setup.defaultName)
const initialState = (): GameState => loadGame() ?? createSetup(de.setup.defaultName)

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  // Loaded right away, so it is usually ready before the setup is done.
  const { places, failed: placesFailed, load: loadPlaces } = usePlaces()
  const placesById = useMemo(() => new Map(places?.map((p) => [p.id, p])), [places])
  const pool = useMemo(() => places && poolOf(places), [places])
  const placeId = state.phase === 'playing' ? state.round.placeId : null
  // Every player has had a turn, the round isn't scored yet.
  const toReveal = state.phase === 'playing' && !playerOnTurn(state) && !state.round.result

  // A saved game whose place has left the dataset (e.g. after an update) can't go on.
  useEffect(() => {
    if (places && placeId && !placesById.has(placeId)) dispatch({ type: 'newGame' })
  }, [places, placesById, placeId])

  useEffect(() => saveGame(state), [state])

  // Scores the round as soon as the place is there.
  const revealPlace = toReveal && placeId ? placesById.get(placeId) : undefined
  useEffect(() => {
    if (revealPlace && pool) dispatch({ type: 'reveal', geometry: revealPlace.geometry, pool })
  }, [revealPlace, pool])

  const startGame = useCallback(
    async (seed = randomSeed(), settings?: Partial<Omit<Settings, 'categories'>>) => {
      if (settings) dispatch({ type: 'updateSettings', settings })
      // Resolves immediately once loaded; rejects (shown by the setup screen) if loading fails.
      dispatch({ type: 'start', pool: poolOf(await loadPlaces()), seed })
    },
    [loadPlaces],
  )

  // After a reveal the places are loaded: it needed them.
  const nextRound = () => pool && dispatch({ type: 'nextRound', pool })
  const playAgain = () => pool && dispatch({ type: 'playAgain', pool, seed: randomSeed() })

  useEffect(() => {
    if (import.meta.env.DEV && map && window.__eingekreist) window.__eingekreist.startGame = startGame
  }, [map, startGame])

  let screen: ReactNode
  if (PlaceDebug) {
    screen = map && (
      // Not ready until loaded (the screenshot script waits for data-ready).
      <Suspense fallback={<div data-ready="false" hidden />}>
        <PlaceDebug map={map} />
      </Suspense>
    )
  } else if (state.phase === 'setup') {
    screen = <SetupScreen state={state} dispatch={dispatch} onStart={() => startGame()} />
  } else if (state.phase === 'finished') {
    screen = <EndScreen state={state} onPlayAgain={playAgain} onNewGame={() => dispatch({ type: 'newGame' })} />
  } else {
    screen = (
      <GameScreen
        key={state.round.number}
        state={state}
        place={placesById.get(state.round.placeId)}
        placesFailed={placesFailed}
        onRetry={() => loadPlaces().catch((e: unknown) => console.warn(e))}
        map={map}
        dispatch={dispatch}
        onNextRound={nextRound}
      />
    )
  }

  return (
    <div className="app">
      <Globe showBorders={state.settings.showBorders} onMapReady={setMap} />
      {screen}
    </div>
  )
}
