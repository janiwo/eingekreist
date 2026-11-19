import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { PlayingState } from '../game/state'
import type { Circle, Place } from '../game/types'
import { de } from '../i18n/de'
import { CircleEditor } from '../map/CircleEditor'
import type { Map as MapLibreMap } from '../map/maplibre'

const t = de.game

interface GameScreenProps {
  state: PlayingState
  /** The round's place; `undefined` while the dataset is still loading. */
  place: Place | undefined
  /** Loading the dataset failed; `onRetry` tries again. */
  placesFailed: boolean
  onRetry: () => void
  map: MapLibreMap | null
  onNewGame: () => void
}

export function GameScreen({ state, place, placesFailed, onRetry, map, onNewGame }: GameScreenProps) {
  const { round, settings } = state
  const category = de.categories[round.category]
  const [circle, setCircle] = useState<Circle | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

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
            <strong>{place ? place.name : t.placeLoading}</strong>
            {place?.qualifier && <span className="prompt__qualifier"> ({place.qualifier})</span>}
          </span>
          {!place && placesFailed && (
            <span className="prompt__error" role="alert">
              {t.loadError}{' '}
              <button type="button" className="link-button" onClick={onRetry}>
                {t.retry}
              </button>
            </span>
          )}
        </div>
        <button type="button" className="button button--secondary button--small" onClick={() => dialogRef.current?.showModal()}>
          {t.newGame}
        </button>
      </header>

      {/* Native modal: focus trap, Escape and backdrop come for free. */}
      <dialog ref={dialogRef} className="card dialog" aria-labelledby="confirm-new-game">
        <p id="confirm-new-game">{t.confirmNewGame}</p>
        <form method="dialog" className="dialog__actions">
          <button className="button button--secondary" autoFocus>
            {t.cancel}
          </button>
          <button type="button" className="button button--primary" onClick={onNewGame}>
            {t.confirm}
          </button>
        </form>
      </dialog>

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
