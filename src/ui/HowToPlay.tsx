import { useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PLAYER_COLORS } from '../game/state'
import { de } from '../i18n/de'

const t = de.howToPlay

interface HowToPlayProps {
  /** A round "?" button over the globe (game bar) instead of a text link (start screen). */
  compact?: boolean
}

/** A button that opens the instructions in a modal dialog. */
export function HowToPlay({ compact = false }: HowToPlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Whether the current click started on the backdrop (see onClick).
  const pressedBackdrop = useRef(false)

  return (
    <>
      <button
        type="button"
        className={compact ? 'icon-button icon-button--small icon-button--panel' : 'link-button how-to-play-link'}
        aria-label={compact ? t.title : undefined}
        title={compact ? t.title : undefined}
        onClick={() => dialogRef.current?.showModal()}
      >
        {compact ? t.openSymbol : t.title}
      </button>
      {/* Native modal: focus trap and Escape come for free. Portaled out of the setup form's DOM
          (and its styles), so it can close through its own form. */}
      {createPortal(
        <dialog
          ref={dialogRef}
          className="card dialog how-to-play"
          aria-labelledby={titleId}
          // A click on the backdrop lands on the dialog element itself (the form fills the rest and
          // scrolls). Both press and release must hit it: a text selection dragged out of the
          // dialog also ends in a click on it.
          onPointerDown={(e) => (pressedBackdrop.current = e.target === e.currentTarget)}
          onClick={(e) => pressedBackdrop.current && e.target === e.currentTarget && e.currentTarget.close()}
        >
          {/* React still bubbles the submit to the setup form, which would start the game. */}
          <form method="dialog" onSubmit={(e) => e.stopPropagation()}>
            <div className="how-to-play__head">
              <h2 id={titleId}>{t.title}</h2>
              <button className="icon-button" aria-label={t.close}>
                {t.closeSymbol}
              </button>
            </div>
            <Section {...t.goal} />
            <Section {...t.round} />
            <Section {...t.scoring}>
              <ScoringFigure />
              <p className="how-to-play__tip">{t.tip}</p>
            </Section>
            <Section {...t.end} />
            <div className="dialog__actions">
              <button className="button button--primary">{t.done}</button>
            </div>
          </form>
        </dialog>,
        document.body,
      )}
    </>
  )
}

function Section({ title, text, children }: { title: string; text: readonly string[]; children?: ReactNode }) {
  return (
    <section className="how-to-play__section">
      <h3>{title}</h3>
      {text.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {children}
    </section>
  )
}

// Example circles in player colors: a big hit, a small hit overlapping the edge by about a third, a tiny miss.
const BIGGER = PLAYER_COLORS[0]
const WINNER = PLAYER_COLORS[3]
const MISS = PLAYER_COLORS[5]

/** The scoring rule at a glance: the smallest circle that overlaps the place wins. */
function ScoringFigure() {
  const f = t.figure
  const legend = [
    [WINNER, f.winner],
    [BIGGER, f.bigger],
    [MISS, f.miss],
  ] as const
  return (
    <figure className="how-to-play__figure">
      <svg viewBox="0 0 210 135" role="img" aria-label={f.label}>
        <polygon
          className="how-to-play__place"
          points="58,48 78,30 96,38 118,24 140,34 150,52 163,62 152,80 158,98 136,108 118,104 98,116 76,106 62,88 50,70"
        />
        <circle cx="105" cy="72" r="40" stroke={BIGGER} />
        <circle cx="161" cy="72" r="14" stroke={WINNER} />
        <circle cx="38" cy="28" r="9" stroke={MISS} />
        <text x="161" y="50" textAnchor="middle" fontSize="14">
          {f.trophy}
        </text>
      </svg>
      <figcaption>
        <ul className="how-to-play__legend">
          {legend.map(([color, label]) => (
            <li key={label} style={{ '--player-color': color } as CSSProperties}>
              {label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
