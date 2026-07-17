import { useState } from 'react'
import { floorplan, scenes } from '../tour.config.js'

/**
 * Matterport-style floorplan. Small dots mark every scan point; the CURRENT room
 * gets a prominent "you are here" marker. An expand button opens a large
 * dollhouse-style view of the whole plan you can click to jump around.
 */
export default function FloorplanMap({ currentId, onNavigate }) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const dots = (big) =>
    scenes.map((s) => {
      const current = s.id === currentId
      return (
        <button
          key={s.id}
          className={`fp-dot ${current ? 'current' : ''}`}
          style={{ left: `${s.map.x}%`, top: `${s.map.y}%` }}
          title={s.name}
          onClick={() => {
            onNavigate(s.id)
            if (big) setExpanded(false)
          }}
        >
          {current && <span className="fp-pulse" />}
          <span className="fp-label">{s.name}</span>
        </button>
      )
    })

  return (
    <>
      <div className={`floorplan ${open ? 'is-open' : 'is-closed'}`}>
        <div className="fp-controls">
          <button className="floorplan-toggle" onClick={() => setOpen((v) => !v)}>
            {open ? '✕ Floor Plan' : '🗺 Floor Plan'}
          </button>
          {open && (
            <button className="fp-expand" title="Buksan nang malaki" onClick={() => setExpanded(true)}>
              ⛶
            </button>
          )}
        </div>

        {open && (
          <div className="floorplan-body">
            <img className="floorplan-img" src={floorplan.image} alt="Floor plan" draggable={false} />
            {dots(false)}
          </div>
        )}
      </div>

      {expanded && (
        <div className="fp-modal" onClick={() => setExpanded(false)}>
          <div className="fp-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="fp-modal-head">
              <span>Floor Plan — piliin ang kwarto na pupuntahan</span>
              <button className="fp-modal-close" onClick={() => setExpanded(false)}>
                ✕
              </button>
            </div>
            <div className="fp-modal-plan">
              <div className="fp-plan-wrap">
                <img src={floorplan.image} alt="Floor plan" draggable={false} />
                {dots(true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
