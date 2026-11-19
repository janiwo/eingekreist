import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Circle } from './game/types'
import { de } from './i18n/de'
import { CircleEditor } from './map/CircleEditor'
import { Globe } from './map/Globe'
import type { Map as MapLibreMap } from './map/maplibre'

export default function App() {
  const [showBorders, setShowBorders] = useState(DEFAULT_SETTINGS.showBorders)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [circle, setCircle] = useState<Circle | null>(null)

  useEffect(() => {
    if (import.meta.env.DEV && map && window.__eingekreist) window.__eingekreist.setCircle = setCircle
  }, [map])

  return (
    <div className="app">
      <Globe showBorders={showBorders} onMapReady={setMap} />
      {map && <CircleEditor map={map} circle={circle} onChange={setCircle} />}
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
      <div className="radius-readout" role="status" aria-live="polite">
        {circle ? (
          <>
            {de.circle.radius}: <strong>{de.formatKm(circle.radiusKm)}</strong>
          </>
        ) : (
          de.circle.placeHint
        )}
      </div>
    </div>
  )
}
