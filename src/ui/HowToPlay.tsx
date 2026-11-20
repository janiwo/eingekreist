import { useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { PLAYER_COLORS } from '../game/state'
import type { Settings } from '../game/types'
import { de } from '../i18n/de'

const t = de.howToPlay

interface HowToPlayProps {
  settings: Pick<Settings, 'targetScore' | 'turnSeconds'>
  /** `link`: a text link (start screen); `icon`: a round "?" button (game bar). */
  variant: 'link' | 'icon'
}

/** A button that opens the instructions in a modal dialog. */
export function HowToPlay({ settings, variant }: HowToPlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = () => dialogRef.current?.close()
  const { goal, round, scoring, end } = t.sections(settings)

  return (
    <>
      {variant === 'link' ? (
        <button type="button" className="link-button how-to-play-link" onClick={() => dialogRef.current?.showModal()}>
          {t.title}
        </button>
      ) : (
        <button
          type="button"
          className="icon-button icon-button--panel"
          aria-label={t.title}
          title={t.title}
          onClick={() => dialogRef.current?.showModal()}
        >
          {t.openSymbol}
        </button>
      )}
      {/* Native modal: focus trap and Escape come for free. No inner <form method="dialog">: on the
          start screen this sits inside the setup form. */}
      <dialog
        ref={dialogRef}
        className="card dialog how-to-play"
        aria-labelledby={titleId}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="how-to-play__head">
          <h2 id={titleId}>{t.title}</h2>
          <button type="button" className="icon-button" aria-label={t.close} onClick={close}>
            {t.closeSymbol}
          </button>
        </div>
        <Section {...goal} />
        <Section {...round} />
        <Section {...scoring}>
          <ScoringFigure />
          <p className="how-to-play__tip">{scoring.tip}</p>
        </Section>
        <Section {...end} />
        <div className="dialog__actions">
          <button type="button" className="button button--primary" onClick={close}>
            {t.done}
          </button>
        </div>
      </dialog>
    </>
  )
}

function Section({ title, text, children }: { title: string; text: string[]; children?: ReactNode }) {
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

// Example circles in player colors: a big hit, a small hit just touching the edge, a tiny miss.
const BIGGER = PLAYER_COLORS[0]
const WINNER = PLAYER_COLORS[3]
const MISS = PLAYER_COLORS[5]

/** The scoring rule at a glance: the smallest circle that touches the place wins. */
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
        <path
          className="how-to-play__place"
          d="M60,50 C70,25 120,22 145,38 C165,50 168,80 152,100 C135,120 90,122 70,108 C50,94 50,70 60,50 Z"
        />
        <circle cx="105" cy="72" r="40" stroke={BIGGER} />
        <circle cx="176" cy="70" r="13" stroke={WINNER} />
        <circle cx="38" cy="28" r="9" stroke={MISS} />
        <text x="176" y="48" textAnchor="middle" fontSize="14">
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
