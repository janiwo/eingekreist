import type { CSSProperties } from 'react'
import { leaders, ranking } from '../game/scoring'
import type { FinishedState } from '../game/state'
import { de } from '../i18n/de'

const t = de.end

interface EndScreenProps {
  state: FinishedState
  /** Loading the places failed; „Play again“ tries again. */
  loadFailed: boolean
  onPlayAgain: () => void
  onNewGame: () => void
}

export function EndScreen({ state, loadFailed, onPlayAgain, onNewGame }: EndScreenProps) {
  const top = leaders(state.players)
  return (
    <div className="screen">
      <section className="card end" data-testid="end" aria-labelledby="end-title">
        <p className="end__meta">
          {t.title} · {t.rounds(state.rounds)}
        </p>
        <h2 id="end-title" className="end__title">
          {top.length === 1 ? t.winner(top[0].name) : t.draw(top.map((p) => p.name))}
        </h2>
        <ol className="ranking">
          {ranking(state.players).map(({ player, rank }) => (
            <li
              key={player.id}
              className={rank === 1 ? 'ranking__first' : undefined}
              style={{ '--player-color': player.color } as CSSProperties}
            >
              <span className="ranking__rank">{t.rank(rank)}</span>
              <span className="player-tag">{player.name}</span>
              <span className="ranking__score">{t.points(player.score)}</span>
            </li>
          ))}
        </ol>
        <div className="end__actions">
          <button
            type="button"
            className="button button--primary"
            title={t.playAgainHint}
            autoFocus
            onClick={onPlayAgain}
          >
            {t.playAgain}
          </button>
          <button type="button" className="button button--secondary" onClick={onNewGame}>
            {t.newGame}
          </button>
        </div>
        {loadFailed && (
          <p className="hint hint--error" role="alert">
            {de.setup.loadError}
          </p>
        )}
      </section>
    </div>
  )
}
