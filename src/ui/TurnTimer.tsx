import { useEffect, useRef, useState } from 'react'
import { de } from '../i18n/de'

/** Seconds left at which the timer turns into a warning. */
const LOW_SECONDS = 10
const TICK_MS = 250

interface TurnTimerProps {
  /** When the turn ends, in ms since the epoch. */
  deadline: number
  /** Called once when the deadline has passed, with the current time. */
  onTimeUp: (now: number) => void
}

const secondsLeft = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 1000))

/** Counts down to `deadline`. Works off the wall clock, so it keeps running across a reload. */
export function TurnTimer({ deadline, onTimeUp }: TurnTimerProps) {
  // Seconds rather than the time: ticks within the same second don't re-render.
  const [seconds, setSeconds] = useState(() => secondsLeft(deadline, Date.now()))
  const onTimeUpRef = useRef(onTimeUp)

  useEffect(() => {
    onTimeUpRef.current = onTimeUp
  })

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setSeconds(secondsLeft(deadline, t))
      if (t >= deadline) {
        clearInterval(id)
        onTimeUpRef.current(t)
      }
    }, TICK_MS)
    return () => clearInterval(id)
  }, [deadline])

  return (
    <div
      className={`timer${seconds <= LOW_SECONDS ? ' timer--low' : ''}`}
      role="timer"
      aria-label={de.game.timeLeft}
    >
      {de.game.seconds(seconds)}
    </div>
  )
}
