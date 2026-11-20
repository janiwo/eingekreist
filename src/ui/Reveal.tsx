import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react'
import { isSuddenDeath, gameWinner, ranking } from '../game/scoring'
import type { PlayingState, RoundResult, Turn } from '../game/state'
import type { Place } from '../game/types'
import { de } from '../i18n/de'
import type { ColoredCircle } from '../map/circleLayer'
import type { Map as MapLibreMap, PaddingOptions } from '../map/maplibre'
import { RevealLayers } from '../map/RevealLayers'

const t = de.reveal
const GAP = 16
/** Never let the padding squeeze the place below this many pixels. */
const MIN_VIEW = 80

interface RevealProps {
  state: PlayingState
  result: RoundResult
  place: Place
  map: MapLibreMap | null
  onNext: () => void
}

/** Turn result in words: the radius, or why there is no circle. */
function circleText(turn: Turn | undefined): string {
  if (!turn) return '–'
  return turn.circle ? de.formatKm(turn.circle.radiusKm) : de.game.outcomes[turn.outcome]
}

/** After every turn: all circles and the place on the globe, plus the round's result and the standings. */
export function Reveal({ state, result, place, map, onNext }: RevealProps) {
  const { players, round, settings } = state
  const cardRef = useRef<HTMLElement>(null)
  const [arrived, setArrived] = useState(false)

  const circles = useMemo(
    () =>
      round.turns.flatMap((turn): ColoredCircle[] => {
        const color = players.find((p) => p.id === turn.playerId)?.color
        return turn.circle && color ? [{ circle: turn.circle, color }] : []
      }),
    [round.turns, players],
  )

  // Keeps the place clear of the header (top) and this card (bottom).
  const padding = useCallback((): PaddingOptions => {
    const height = window.innerHeight
    const top = (document.querySelector('.game-bar')?.getBoundingClientRect().bottom ?? 0) + GAP
    const cardTop = cardRef.current?.getBoundingClientRect().top ?? height
    let bottom = height - cardTop + GAP
    // On a short screen the card may cover most of it; then let it overlap the place a little.
    if (height - top - bottom < MIN_VIEW) bottom = Math.max(GAP, height - top - MIN_VIEW)
    return { top, bottom, left: GAP * 2, right: GAP * 2 }
  }, [])

  const winners = players.filter((p) => result.winnerIds.includes(p.id))
  const over = gameWinner(players, settings.targetScore) !== null
  const suddenDeath = isSuddenDeath(players, settings.targetScore)

  return (
    <>
      {map && (
        <RevealLayers map={map} place={place} circles={circles} padding={padding} onArrived={() => setArrived(true)} />
      )}
      <div className="reveal-wrap">
        <section
          ref={cardRef}
          className="card reveal"
          data-testid="reveal"
          // Ready for screenshots once the globe has arrived at the place.
          data-ready={!map || arrived}
          aria-labelledby="reveal-title"
        >
          <h2 id="reveal-title" className="reveal__title">
            {t.title(round.number)}
          </h2>
          <p className="reveal__winner" role="status">
            {winners.length > 0 ? `🏆 ${t.winners(winners.map((p) => p.name))}` : t.noWinner}
          </p>
          <table className="results">
            <thead>
              <tr>
                <th scope="col">{t.player}</th>
                <th scope="col">{t.circle}</th>
                <th scope="col">{t.result}</th>
                <th scope="col" className="results__score">
                  {t.score}
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking(players).map(({ player }) => {
                const turn = round.turns.find((tu) => tu.playerId === player.id)
                const won = result.winnerIds.includes(player.id)
                const hit = result.hitIds.includes(player.id)
                return (
                  <tr
                    key={player.id}
                    className={won ? 'results__winner' : undefined}
                    style={{ '--player-color': player.color } as CSSProperties}
                  >
                    <th scope="row">
                      <span className="player-tag">{player.name}</span>
                    </th>
                    <td>{circleText(turn)}</td>
                    <td className={hit ? 'results__hit' : 'results__miss'}>
                      {turn?.circle ? (hit ? `✓ ${t.hit}` : `✗ ${t.miss}`) : ''}
                    </td>
                    <td className="results__score">
                      {won && <span className="results__gain">{t.pointGained}</span>} <strong>{player.score}</strong>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {suddenDeath && (
            <p className="hint reveal__note" data-testid="sudden-death">
              {t.suddenDeath(Math.max(...players.map((p) => p.score)))}
            </p>
          )}
          <button type="button" className="button button--primary reveal__next" onClick={onNext}>
            {over ? t.toResults : t.nextRound}
          </button>
        </section>
      </div>
    </>
  )
}
