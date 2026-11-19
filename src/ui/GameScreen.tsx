import { useEffect, useState, type CSSProperties } from 'react'
import { loadPlaces } from '../data/places'
import type { PlayingState } from '../game/state'
import type { Circle, Place } from '../game/types'
import { de } from '../i18n/de'
import { CircleEditor } from '../map/CircleEditor'
import type { Map as MapLibreMap } from '../map/maplibre'

const t = de.game

/** The place with this ID, once the dataset has loaded (`undefined` while loading or unknown). */
function usePlace(id: string): Place | undefined {
  const [places, setPlaces] = useState<Place[] | null>(null)
  useEffect(() => {
    let alive = true
    loadPlaces()
      .then((p) => alive && setPlaces(p))
      .catch((e: unknown) => console.warn(e))
    return () => {
      alive = false
    }
  }, [])
  return places?.find((p) => p.id === id)
}

interface GameScreenProps {
  state: PlayingState
  map: MapLibreMap | null
  onNewGame: () => void
}

export function GameScreen({ state, map, onNewGame }: GameScreenProps) {
  const { round, settings } = state
  const place = usePlace(round.placeId)
  const category = de.categories[round.category]
  const [circle, setCircle] = useState<Circle | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV || !window.__eingekreist) return
    window.__eingekreist.setCircle = setCircle
    return () => {
      if (window.__eingekreist) delete window.__eingekreist.setCircle
    }
  }, [map])

  return (
    <>
      {map && <CircleEditor map={map} circle={circle} onChange={setCircle} />}

      <header className="game-bar">
        <div
          className="prompt"
          data-testid="prompt"
          data-ready={place !== undefined}
          style={{ '--accent': category.color } as CSSProperties}
        >
          <span className="prompt__meta">
            {t.round(round.number)} · {t.targetScore(settings.targetScore)}
          </span>
          <span className="prompt__text">
            <span aria-hidden="true">{category.icon}</span> {category.label}:{' '}
            <strong>{place ? place.name : '…'}</strong>
            {place?.qualifier && <span className="prompt__qualifier"> ({place.qualifier})</span>}
          </span>
        </div>
        <button type="button" className="button button--secondary button--small" onClick={() => setConfirming(true)}>
          {t.newGame}
        </button>
      </header>

      {confirming && (
        <div className="dialog-backdrop">
          <div className="card dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-new-game">
            <p id="confirm-new-game">{t.confirmNewGame}</p>
            <div className="dialog__actions">
              <button type="button" className="button button--secondary" autoFocus onClick={() => setConfirming(false)}>
                {t.cancel}
              </button>
              <button type="button" className="button button--primary" onClick={onNewGame}>
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="radius-readout" role="status" aria-live="polite">
        {circle ? (
          <>
            {de.circle.radius}: <strong>{de.formatKm(circle.radiusKm)}</strong>
          </>
        ) : (
          de.circle.placeHint
        )}
      </div>
    </>
  )
}
