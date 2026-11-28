import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from 'react'
import { isSuddenDeath, leaders } from '../game/scoring'
import type { PlayingState, RoundResult, Turn } from '../game/state'
import type { Circle, Place } from '../game/types'
import { useI18n } from '../i18n/context'
import type { Strings } from '../i18n/de'
import type { ColoredCircle } from '../map/circleLayer'
import type { Map as MapLibreMap, MapMovementEvent } from '../map/maplibre'
import { flyToCircle, flyToPlace } from '../map/revealCamera'
import { RevealLayers } from '../map/RevealLayers'
import { FOCUS_FLIGHT_MS, type Padding } from '../map/view'
import { ignoreKeyRepeat } from './keys'

const GAP = 16
/** Never let the padding squeeze the place below this many pixels. */
const MIN_VIEW = 80

interface RevealProps {
  state: PlayingState
  result: RoundResult
  place: Place
  map: MapLibreMap | null
  /** The bar above the globe; the place is kept clear of it. */
  headerRef: RefObject<HTMLElement | null>
  onNext: () => void
}

/** Turn result in words: the radius, or why there is no circle. */
function circleText(turn: Turn | undefined, t: Strings): string {
  if (!turn) return t.reveal.out
  return turn.circle ? t.formatKm(turn.circle.radiusKm) : t.game.outcomes[turn.outcome]
}

/** After every turn: all circles and the place on the globe, plus the round's result and the standings. */
export function Reveal({ state, result, place, map, headerRef, onNext }: RevealProps) {
  const { t, locale } = useI18n()
  const { players, round, settings } = state
  const placeName = place.name[locale]
  const cardRef = useRef<HTMLElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const collapseRef = useRef<HTMLButtonElement>(null)
  const expandRef = useRef<HTMLButtonElement>(null)
  const barNextRef = useRef<HTMLButtonElement>(null)
  // Collapsed, a slim bar shows instead of the card; every round starts expanded.
  const [collapsed, setCollapsed] = useState(false)
  const [arrived, setArrived] = useState(false)
  const onArrived = useCallback(() => setArrived(true), [])
  // Whether the globe has left the place's view: then the button back to it shows.
  const [away, setAway] = useState(false)

  const circles = useMemo(
    () =>
      round.turns.flatMap((turn): ColoredCircle[] => {
        const color = players.find((p) => p.id === turn.playerId)?.color
        return turn.circle && color ? [{ circle: turn.circle, color }] : []
      }),
    [round.turns, players],
  )

  // Keeps the place clear of the header (top) and of this card (collapsed or not: the card
  // stays laid out, invisibly, so every flight goes to the same view): in the larger free area,
  // above the card or left of it (the card sits at the bottom, or at the right in landscape).
  const padding = useCallback((): Padding => {
    const { innerWidth: width, innerHeight: height } = window
    const top = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + GAP
    const card = cardRef.current?.getBoundingClientRect()
    const above = card ? card.top - top : height - top
    const beside = card ? card.left : 0
    if (beside * (height - top) > above * width) {
      // Never squeeze the place below MIN_VIEW; then let the card overlap it a little.
      const right = Math.max(GAP, Math.min(width - card!.left + GAP, width - GAP - MIN_VIEW))
      return { top, bottom: GAP, left: GAP, right }
    }
    const bottom = Math.max(GAP, Math.min(height - (card?.top ?? height) + GAP, height - top - MIN_VIEW))
    return { top, bottom, left: GAP * 2, right: GAP * 2 }
  }, [headerRef])

  // Where the game bar ends; the card stays below it when it sits at the side (landscape CSS).
  const [barBottom, setBarBottom] = useState<number | null>(null)
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const observer = new ResizeObserver(() => setBarBottom(header.getBoundingClientRect().bottom))
    observer.observe(header)
    return () => observer.disconnect()
  }, [headerRef])

  // Moving the globe by hand (drag, zoom, rotate, keys) leaves the place's view. Camera moves
  // by the app and resizes carry no `originalEvent`.
  useEffect(() => {
    if (!map) return
    const onMoveStart = (e: MapMovementEvent) => e.originalEvent && setAway(true)
    map.on('movestart', onMoveStart)
    return () => {
      map.off('movestart', onMoveStart)
    }
  }, [map])

  // Both interrupt a running flight, the initial one included.
  const focusCircle = (circle: Circle) => {
    setAway(true)
    if (map) flyToCircle(map, circle, padding(), FOCUS_FLIGHT_MS)
  }
  const focusPlace = (e: MouseEvent<HTMLButtonElement>) => {
    setAway(false)
    // The button hides; keyboard players continue on „Next round“ (the bar's, when collapsed).
    if (document.activeElement === e.currentTarget) {
      ;(collapsed ? barNextRef : nextRef).current?.focus({ preventScroll: true })
    }
    if (map) flyToPlace(map, place, padding(), FOCUS_FLIGHT_MS)
  }

  // Collapsing or expanding never moves the globe. Focus follows to the other toggle.
  const collapse = () => {
    setCollapsed(true)
    requestAnimationFrame(() => expandRef.current?.focus({ preventScroll: true }))
  }
  const expand = () => {
    setCollapsed(false)
    requestAnimationFrame(() => collapseRef.current?.focus({ preventScroll: true }))
  }
  // A tap anywhere on the bar expands it, except on its other buttons.
  const onBarClick = (e: MouseEvent<HTMLElement>) => {
    const button = (e.target as Element).closest('button')
    if (!button || button === expandRef.current) expand()
  }

  // For keyboard players; not `autoFocus`, which would scroll the card past its title.
  useEffect(() => nextRef.current?.focus({ preventScroll: true }), [])

  const winners = players.filter((p) => result.winnerIds.includes(p.id))
  const suddenDeath = !result.gameOver && isSuddenDeath(players, settings.targetScore)
  const top = leaders(players)
  const winnerText = winners.length > 0 ? t.reveal.winners(winners.map((p) => p.name)) : t.reveal.noWinner
  const nextText = result.gameOver ? t.reveal.toResults : t.reveal.nextRound
  const targetButton = (extraClass: string) => (
    <button
      type="button"
      className={`reveal__target${extraClass}${away ? ' reveal__target--shown' : ''}`}
      aria-label={t.reveal.toPlace(placeName)}
      onClick={focusPlace}
    >
      <span aria-hidden="true">{t.reveal.toPlaceSymbol}</span> {placeName}
    </button>
  )

  return (
    <>
      {map && (
        <RevealLayers map={map} place={place} circles={circles} padding={padding} onArrived={onArrived} />
      )}
      <div
        className="reveal-wrap"
        style={barBottom === null ? undefined : ({ '--bar-bottom': `${barBottom}px` } as CSSProperties)}
      >
        <section
          ref={cardRef}
          id="reveal-card"
          className={`card reveal${collapsed ? ' reveal--collapsed' : ''}`}
          data-testid="reveal"
          // Ready for screenshots once the globe has arrived at the place.
          data-ready={!map || arrived}
          aria-labelledby="reveal-title"
        >
          <h2 id="reveal-title" className="reveal__title">
            {t.reveal.title(round.number)}
          </h2>
          <p className="reveal__winner" role="status">
            {winnerText}
          </p>
          {/* The toggle sits in the card's corner; on short landscape screens (no title) beside the pill. */}
          <div className="reveal__nav">
            {targetButton('')}
            <button
              ref={collapseRef}
              type="button"
              className="reveal__toggle"
              aria-label={t.reveal.collapse}
              title={t.reveal.collapse}
              aria-expanded="true"
              aria-controls="reveal-card"
              onClick={collapse}
            >
              <span aria-hidden="true">{t.reveal.collapseSymbol}</span>
            </button>
          </div>
          <table className="results">
            <thead>
              <tr>
                <th scope="col">{t.reveal.player}</th>
                <th scope="col">{t.reveal.circle}</th>
                <th scope="col">{t.reveal.result}</th>
                <th scope="col" className="results__score">
                  {t.reveal.score}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Sorted by score: the standings. */}
              {[...players].sort((a, b) => b.score - a.score).map((player) => {
                const turn = round.turns.find((tu) => tu.playerId === player.id)
                const won = result.winnerIds.includes(player.id)
                const hit = result.hitIds.includes(player.id)
                const circle = turn?.circle
                const classes = [won ? 'results__winner' : turn ? '' : 'results__out', circle ? 'results__focusable' : '']
                return (
                  <tr
                    key={player.id}
                    className={classes.filter(Boolean).join(' ') || undefined}
                    style={{ '--player-color': player.color } as CSSProperties}
                    // The whole row for pointers; the name's button (whose click bubbles here) for keys.
                    onClick={circle ? () => focusCircle(circle) : undefined}
                  >
                    <th scope="row">
                      {circle ? (
                        <button type="button" className="results__focus" title={t.reveal.toCircle(player.name)}>
                          <span className="player-tag">{player.name}</span>
                        </button>
                      ) : (
                        <span className="player-tag">{player.name}</span>
                      )}
                    </th>
                    <td>{circleText(turn, t)}</td>
                    <td className={hit ? 'results__hit' : 'results__miss'}>
                      {turn?.circle ? (hit ? t.reveal.hit : t.reveal.miss) : ''}
                    </td>
                    <td className="results__score">
                      {won && <span className="results__gain">{t.reveal.pointGained}</span>} <strong>{player.score}</strong>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {suddenDeath && (
            <p className="hint reveal__note" data-testid="sudden-death">
              {t.reveal.suddenDeath(top.map((p) => p.name), top[0].score)}
            </p>
          )}
          <button
            ref={nextRef}
            type="button"
            className="button button--primary reveal__next"
            onKeyDown={ignoreKeyRepeat}
            onClick={onNext}
          >
            {nextText}
          </button>
        </section>
        {/* Collapsed: the winner, the way back to the place and on; the map stays free. */}
        <section
          className={`card reveal-bar${collapsed ? ' reveal-bar--shown' : ''}`}
          data-testid="reveal-bar"
          aria-label={t.reveal.title(round.number)}
          onClick={onBarClick}
        >
          <div className="reveal-bar__head">
            <p className="reveal-bar__winner">{winnerText}</p>
            <button
              ref={expandRef}
              type="button"
              className="reveal__toggle reveal-bar__toggle"
              aria-label={t.reveal.expand}
              title={t.reveal.expand}
              aria-expanded="false"
              aria-controls="reveal-card"
            >
              <span aria-hidden="true">{t.reveal.expandSymbol}</span>
            </button>
          </div>
          <div className="reveal-bar__actions">
            {away && targetButton(' reveal-bar__target')}
            <button
              ref={barNextRef}
              type="button"
              className="button button--primary reveal-bar__next"
              onKeyDown={ignoreKeyRepeat}
              onClick={onNext}
            >
              {nextText}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
