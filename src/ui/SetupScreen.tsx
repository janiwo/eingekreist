import { useState, type CSSProperties, type Dispatch } from 'react'
import {
  MAX_TARGET_SCORE,
  MIN_TARGET_SCORE,
  PLAYER_COLORS,
  setupProblems,
  type GameAction,
  type SetupState,
} from '../game/state'
import { CATEGORIES, MAX_PLAYERS, MIN_PLAYERS } from '../game/types'
import { de } from '../i18n/de'

const t = de.setup
const TIMER_OPTIONS = [30, 45, 60, 90, 120] as const

interface SetupScreenProps {
  state: SetupState
  dispatch: Dispatch<GameAction>
  /** Starts the game; resolves once it has started or rejects if the places can't be loaded. */
  onStart: () => Promise<void>
}

export function SetupScreen({ state, dispatch, onStart }: SetupScreenProps) {
  const { players, settings } = state
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const problems = setupProblems(state)

  const start = () => {
    setStarting(true)
    setLoadFailed(false)
    onStart()
      .catch((e: unknown) => {
        console.warn(e)
        setLoadFailed(true)
      })
      .finally(() => setStarting(false))
  }

  return (
    <main className="screen">
      <form
        className="card setup"
        onSubmit={(e) => {
          e.preventDefault()
          start()
        }}
      >
        <h1 className="brand">{de.appName}</h1>

        <section aria-labelledby="setup-players">
          <h2 id="setup-players">{t.players}</h2>
          <ol className="player-list">
            {players.map((p, i) => (
              <li key={p.id} className="player-row">
                <button
                  type="button"
                  className="color-dot"
                  style={{ background: p.color }}
                  aria-label={t.chooseColor(p.name)}
                  aria-expanded={colorPickerFor === p.id}
                  onClick={() => setColorPickerFor(colorPickerFor === p.id ? null : p.id)}
                />
                <input
                  className="text-input"
                  aria-label={t.playerName(i + 1)}
                  value={p.name}
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) => dispatch({ type: 'renamePlayer', id: p.id, name: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t.removePlayer(p.name)}
                  disabled={players.length <= MIN_PLAYERS}
                  onClick={() => dispatch({ type: 'removePlayer', id: p.id })}
                >
                  ✕
                </button>
                {colorPickerFor === p.id && (
                  <div className="swatches" role="radiogroup" aria-label={t.chooseColor(p.name)}>
                    {PLAYER_COLORS.map((color, ci) => (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={p.color === color}
                        aria-label={t.colorNames[ci]}
                        className="swatch"
                        style={{ background: color }}
                        onClick={() => {
                          dispatch({ type: 'setPlayerColor', id: p.id, color })
                          setColorPickerFor(null)
                        }}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
          {players.length < MAX_PLAYERS && (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => dispatch({ type: 'addPlayer', defaultName: t.defaultName })}
            >
              + {t.addPlayer}
            </button>
          )}
        </section>

        <section aria-labelledby="setup-settings">
          <h2 id="setup-settings">{t.settings}</h2>
          <div className="setting">
            <span id="setup-target">{t.targetScore}</span>
            <div className="stepper" role="group" aria-labelledby="setup-target">
              <button
                type="button"
                className="icon-button"
                aria-label={t.decrease}
                disabled={settings.targetScore <= MIN_TARGET_SCORE}
                onClick={() => dispatch({ type: 'updateSettings', settings: { targetScore: settings.targetScore - 1 } })}
              >
                −
              </button>
              <output aria-live="polite" data-testid="target-score">
                {settings.targetScore}
              </output>
              <button
                type="button"
                className="icon-button"
                aria-label={t.increase}
                disabled={settings.targetScore >= MAX_TARGET_SCORE}
                onClick={() => dispatch({ type: 'updateSettings', settings: { targetScore: settings.targetScore + 1 } })}
              >
                +
              </button>
            </div>
          </div>
          <label className="setting">
            <span>{t.timer}</span>
            <select
              className="select"
              value={settings.turnSeconds ?? 'off'}
              onChange={(e) =>
                dispatch({
                  type: 'updateSettings',
                  settings: { turnSeconds: e.target.value === 'off' ? null : Number(e.target.value) },
                })
              }
            >
              {TIMER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t.seconds(s)}
                </option>
              ))}
              <option value="off">{t.timerOff}</option>
            </select>
          </label>
          <label className="setting">
            <span>{de.showBorders}</span>
            <input
              type="checkbox"
              className="switch"
              checked={settings.showBorders}
              onChange={(e) => dispatch({ type: 'updateSettings', settings: { showBorders: e.target.checked } })}
            />
          </label>
        </section>

        <section aria-labelledby="setup-categories">
          <h2 id="setup-categories">{t.categories}</h2>
          <div className="chips">
            {CATEGORIES.map((c) => {
              const on = settings.categories.includes(c)
              const cat = de.categories[c]
              return (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  style={{ '--chip-color': cat.color } as CSSProperties}
                  onClick={() => dispatch({ type: 'toggleCategory', category: c })}
                >
                  <span aria-hidden="true">{cat.icon}</span> {cat.plural}
                </button>
              )
            })}
          </div>
          {settings.categories.length === 1 && <p className="hint">{t.atLeastOneCategory}</p>}
        </section>

        <div className="setup-footer">
          {problems.map((p) => (
            <p key={p} className="hint hint--error" role="alert">
              {t.problems[p]}
            </p>
          ))}
          {loadFailed && (
            <p className="hint hint--error" role="alert">
              {t.loadError}
            </p>
          )}
          <button type="submit" className="button button--primary" disabled={problems.length > 0 || starting}>
            {starting ? t.loading : t.start}
          </button>
        </div>
      </form>
    </main>
  )
}
