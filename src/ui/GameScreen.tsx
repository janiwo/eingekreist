import { useCallback, useEffect, useRef, type CSSProperties, type Dispatch, type ReactNode } from 'react'
import { playerOnTurn, turnDeadline, type GameAction, type PlayingState } from '../game/state'
import { MIN_RADIUS_KM, type Circle, type Place, type Player } from '../game/types'
import { de } from '../i18n/de'
import { CircleEditor } from '../map/CircleEditor'
import type { Map as MapLibreMap } from '../map/maplibre'
import { START_VIEW, zoomForRadius } from '../map/view'
import { HowToPlay } from './HowToPlay'
import { ignoreKeyRepeat } from './keys'
import { Reveal } from './Reveal'
import { TurnTimer } from './TurnTimer'

const t = de.game

/** After shrinking to the minimum, zoom in until the two handles are this far apart. */
const MIN_RADIUS_HANDLE_GAP_PX = 32
/** Long enough to see that the circle stays put, short enough not to eat the turn time. */
const MIN_RADIUS_ZOOM_MS = 1000

interface GameScreenProps {
  state: PlayingState
  /** The round's place; `undefined` while the dataset is still loading. */
  place: Place | undefined
  /** Loading the dataset failed; `onRetry` tries again. */
  placesFailed: boolean
  onRetry: () => void
  map: MapLibreMap | null
  dispatch: Dispatch<GameAction>
  /** After the reveal: on to the next round (or the end of the game). */
  onNextRound: () => void
}

export function GameScreen({ state, place, placesFailed, onRetry, map, dispatch, onNextRound }: GameScreenProps) {
  const { round } = state
  const player = playerOnTurn(state)
  const headerRef = useRef<HTMLElement>(null)
  const playing = player !== null && round.turnStartedAt !== null
  const loadError = !place && placesFailed && (
    <span className="load-error" role="alert">
      {t.loadError}{' '}
      <button type="button" className="link-button" onClick={onRetry}>
        {t.retry}
      </button>
    </span>
  )

  let body: ReactNode
  if (!player) {
    // The app scores the round as soon as the place is there.
    body = round.result && place ? (
      <Reveal state={state} result={round.result} place={place} map={map} headerRef={headerRef} onNext={onNextRound} />
    ) : (
      <Evaluating />
    )
  } else if (!playing) {
    body = (
      <Handover
        round={round.number}
        player={player}
        // The timer must not start before the player can see the place.
        ready={place !== undefined}
        loadError={loadError}
        onStart={() => dispatch({ type: 'startTurn', now: Date.now() })}
      />
    )
  } else {
    // Keyed by turn: nothing of the previous turn's editor survives.
    body = <Turn key={round.turns.length} state={state} player={player} map={map} dispatch={dispatch} />
  }

  return (
    <>
      {body}
      {/* Always rendered in the same place, so an open dialog survives the end of a turn. */}
      <header ref={headerRef} className="game-bar">
        {(playing || !player) && <Prompt state={state} player={player} place={place} loadError={loadError} />}
        <div className="game-bar__actions">
          {/* Not during a turn: the timer runs, and the dialog would hide the globe. */}
          {!playing && <HowToPlay compact />}
          <NewGameButton onConfirm={() => dispatch({ type: 'newGame' })} />
        </div>
      </header>
    </>
  )
}

interface HandoverProps {
  round: number
  player: Player
  ready: boolean
  loadError: ReactNode
  onStart: () => void
}

/** Covers the globe until the next player takes the device. */
function Handover({ round, player, ready, loadError, onStart }: HandoverProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  // The previous turn's controls are gone; give keyboard players a place to start. Only once
  // the button is enabled (a disabled button can't take the focus).
  useEffect(() => {
    if (ready) buttonRef.current?.focus({ preventScroll: true })
  }, [ready])

  return (
    <div className="screen screen--opaque">
      <div className="handover-wrap">
        <button
          type="button"
          className="card handover"
          data-testid="handover"
          style={{ '--player-color': player.color } as CSSProperties}
          ref={buttonRef}
          disabled={!ready}
          onKeyDown={ignoreKeyRepeat}
          onClick={onStart}
        >
          <span className="handover__meta">{t.round(round)}</span>
          <span className="handover__title">
            {t.handOver} <strong className="handover__name">{player.name}</strong>
          </span>
          <span className="handover__hint">{ready ? t.tapToStart : de.setup.loading}</span>
        </button>
        {loadError}
      </div>
    </div>
  )
}

interface PromptProps {
  state: PlayingState
  /** The player on turn; `null` during the reveal. */
  player: Player | null
  place: Place | undefined
  loadError: ReactNode
}

function Prompt({ state, player, place, loadError }: PromptProps) {
  const { round, settings } = state
  const category = de.categories[round.category]
  return (
    <div
      className="prompt"
      data-testid="prompt"
      data-ready={place !== undefined}
      style={{ '--category-color': category.color } as CSSProperties}
    >
      <span className="prompt__icon" aria-hidden="true">
        {category.icon}
      </span>
      <div className="prompt__body">
        <span className="prompt__text">
          <span className="prompt__category">
            {category.label}
            <span className="sr-only">: </span>
          </span>
          <span className="prompt__place">
            <strong>{place ? place.name : t.placeLoading}</strong>
            {place?.qualifier && <span className="prompt__qualifier"> ({place.qualifier})</span>}
          </span>
        </span>
        <span className="prompt__meta">
          {player && (
            <>
              <span className="player-tag nowrap" style={{ '--player-color': player.color } as CSSProperties}>
                {t.onTurn(player.name)}
              </span>{' '}
              ·{' '}
            </>
          )}
          <span className="nowrap">{t.round(round.number)}</span> ·{' '}
          <span className="nowrap">{t.targetScore(settings.targetScore)}</span>
        </span>
        {loadError}
      </div>
    </div>
  )
}

interface TurnProps {
  state: PlayingState
  player: Player
  map: MapLibreMap | null
  dispatch: Dispatch<GameAction>
}

function Turn({ state, player, map, dispatch }: TurnProps) {
  const circle = state.round.draft
  const deadline = turnDeadline(state)
  const setCircle = useCallback((c: Circle) => dispatch({ type: 'setDraft', circle: c }), [dispatch])

  // Shrinks the circle to the minimum radius and zooms in (never out) until its handles separate.
  const shrinkToMin = () => {
    if (!circle) return
    setCircle({ ...circle, radiusKm: MIN_RADIUS_KM })
    if (!map) return
    const zoom = Math.min(map.getMaxZoom(), zoomForRadius(MIN_RADIUS_KM, MIN_RADIUS_HANDLE_GAP_PX, circle.center[1]))
    // flyTo, not easeTo: easeTo blends center and zoom linearly, so most of the visible panning
    // lands at the end (zoom first, then pan). flyTo keeps the on-screen motion even.
    if (zoom > map.getZoom()) map.flyTo({ center: circle.center, zoom, duration: MIN_RADIUS_ZOOM_MS })
  }

  // Every player starts from the same view (spec §2).
  useEffect(() => {
    if (!map) return
    map.stop()
    map.jumpTo(START_VIEW)
    // Keyboard players continue right on the globe (the handover button they used is gone).
    map.getCanvas().focus({ preventScroll: true })
  }, [map])

  useEffect(() => {
    if (!import.meta.env.DEV || !window.__eingekreist) return
    window.__eingekreist.setCircle = setCircle
    return () => {
      if (window.__eingekreist) delete window.__eingekreist.setCircle
    }
  }, [map, setCircle])

  return (
    <>
      {map && <CircleEditor map={map} circle={circle} onChange={setCircle} color={player.color} />}

      <footer className="turn-bar">
        <div className="radius-row">
          <div className="radius-readout" role="status" aria-live="polite">
            {circle ? (
              <>
                {de.circle.radius}: <strong>{de.formatKm(circle.radiusKm)}</strong>
              </>
            ) : (
              de.circle.placeHint
            )}
          </div>
          <button
            type="button"
            className="icon-button icon-button--panel min-radius-button"
            aria-label={de.circle.minRadius}
            title={de.circle.minRadius}
            disabled={!circle || circle.radiusKm <= MIN_RADIUS_KM}
            onClick={shrinkToMin}
          >
            <TargetIcon />
          </button>
        </div>
        <div className="turn-actions">
          {deadline !== null && (
            <TurnTimer deadline={deadline} onTimeUp={(now) => dispatch({ type: 'timeUp', now })} />
          )}
          <button
            type="button"
            className="button button--primary"
            disabled={!circle}
            onClick={() => dispatch({ type: 'submitTurn' })}
          >
            {t.submit}
          </button>
        </div>
      </footer>
    </>
  )
}

/** A small target: a dot inside two rings. */
function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

/** Every player has had a turn; the round is being scored (the prompt shows a load error, if any). */
function Evaluating() {
  return (
    <div className="screen screen--opaque">
      <p className="hint" data-ready="false">
        {de.reveal.evaluating}
      </p>
    </div>
  )
}

function NewGameButton({ onConfirm }: { onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button
        type="button"
        className="button button--secondary button--panel button--small new-game-button"
        // The label shrinks to a symbol on narrow screens; the name stays.
        aria-label={t.newGame}
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="new-game-button__label">{t.newGame}</span>
        <span className="new-game-button__symbol" aria-hidden="true">
          {t.newGameSymbol}
        </span>
      </button>
      {/* Native modal: focus trap, Escape and backdrop come for free. */}
      <dialog ref={dialogRef} className="card dialog" aria-labelledby="confirm-new-game">
        <p id="confirm-new-game">{t.confirmNewGame}</p>
        <form method="dialog" className="dialog__actions">
          <button className="button button--secondary" autoFocus>
            {t.cancel}
          </button>
          <button type="button" className="button button--primary" onClick={onConfirm}>
            {t.confirm}
          </button>
        </form>
      </dialog>
    </>
  )
}
