import { useCallback, useEffect, useRef, type CSSProperties, type Dispatch, type ReactNode } from 'react'
import { playerOnTurn, turnDeadline, type GameAction, type PlayingState } from '../game/state'
import type { Circle, Place, Player } from '../game/types'
import { de } from '../i18n/de'
import { CircleEditor } from '../map/CircleEditor'
import type { Map as MapLibreMap } from '../map/maplibre'
import { START_VIEW } from '../map/view'
import { HowToPlay } from './HowToPlay'
import { Reveal } from './Reveal'
import { TurnTimer } from './TurnTimer'

const t = de.game

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
          {!playing && <HowToPlay settings={state.settings} compact />}
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
  return (
    <div className="screen screen--opaque">
      <div className="handover-wrap">
        <button
          type="button"
          className="card handover"
          data-testid="handover"
          style={{ '--player-color': player.color } as CSSProperties}
          disabled={!ready}
          // The previous turn's controls are gone; give keyboard players a place to start.
          autoFocus
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
              <span className="player-tag" style={{ '--player-color': player.color } as CSSProperties}>
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
        <div className="radius-readout" role="status" aria-live="polite">
          {circle ? (
            <>
              {de.circle.radius}: <strong>{de.formatKm(circle.radiusKm)}</strong>
            </>
          ) : (
            de.circle.placeHint
          )}
        </div>
        <div className="turn-actions">
          <button
            type="button"
            className="button button--secondary button--panel"
            onClick={() => dispatch({ type: 'passTurn' })}
          >
            {t.pass}
          </button>
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
        className="button button--secondary button--panel button--small"
        onClick={() => dialogRef.current?.showModal()}
      >
        {t.newGame}
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
