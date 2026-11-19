import { useState } from 'react'
import { DEFAULT_SETTINGS } from './game/types'
import { de } from './i18n/de'
import { Globe } from './map/Globe'

export default function App() {
  const [showBorders, setShowBorders] = useState(DEFAULT_SETTINGS.showBorders)

  return (
    <div className="app">
      <Globe showBorders={showBorders} />
      <div className="dev-panel">
        <strong>{de.appName}</strong>
        <label>
          <input
            type="checkbox"
            checked={showBorders}
            onChange={(e) => setShowBorders(e.target.checked)}
          />
          {de.showBorders}
        </label>
      </div>
    </div>
  )
}
