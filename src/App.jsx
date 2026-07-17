import { useCallback, useEffect, useRef, useState } from 'react'
import Viewer from './components/Viewer.jsx'
import FloorplanMap from './components/FloorplanMap.jsx'
import { scenes, sceneById, startSceneId, tourInfo } from './tour.config.js'

export default function App() {
  const [currentId, setCurrentId] = useState(startSceneId)
  const [autoRotate, setAutoRotate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pose, setPose] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [aimMode, setAimMode] = useState(false)
  const [walk, setWalk] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [activePlace, setActivePlace] = useState(null)
  const [overrides, setOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tour-ring-overrides') || '{}')
    } catch {
      return {}
    }
  })
  const hudRef = useRef(null)
  const walkRef = useRef(null)
  const walkToken = useRef(0)

  const scene = sceneById(currentId) || scenes[0]

  useEffect(() => {
    walkRef.current = walk
  }, [walk])

  // test/debug hook: lets an automated browser trigger a walk transition
  useEffect(() => {
    window.__tourNavigate = navigate
    window.__tourState = () => ({ currentId, walking: !!walkRef.current })
  })

  const saveOverrides = useCallback((next) => {
    setOverrides(next)
    try {
      localStorage.setItem('tour-ring-overrides', JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  // when entering edit mode (or switching scene while editing) pick the first ring
  useEffect(() => {
    if (editMode) setActivePlace(scene.hotspots?.[0]?.target ?? null)
  }, [editMode, currentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlace = useCallback(
    (yaw, dist) => {
      if (!activePlace) return
      const key = `${currentId}:${activePlace}`
      saveOverrides({
        ...overrides,
        [key]: { yaw: Math.round(yaw), dist: Math.round(dist * 10) / 10 },
      })
    },
    [activePlace, currentId, overrides, saveOverrides],
  )

  const resetScene = useCallback(() => {
    const next = { ...overrides }
    scene.hotspots?.forEach((h) => delete next[`${currentId}:${h.target}`])
    saveOverrides(next)
  }, [overrides, scene, currentId, saveOverrides])

  // live aim readout written imperatively (no per-frame React re-render)
  const handlePoseLive = useCallback((yaw, pitch, dist) => {
    if (hudRef.current) {
      hudRef.current.textContent =
        dist != null
          ? `yaw ${yaw}°   dist ${dist}`
          : `yaw ${yaw}°   (tumingin pababa sa sahig)`
    }
  }, [])

  // yaw !== null (from a floor ring) triggers the walk-forward transition;
  // tabs / floorplan pass no yaw and do a plain crossfade jump.
  const navigate = useCallback(
    (id, yaw = null, arriveYaw = null) => {
      if (!sceneById(id) || walkRef.current) return
      if (yaw == null || id === currentId) {
        setCurrentId(id)
        return
      }
      // preload the destination so the crossfade is ready at the peak
      const target = sceneById(id)
      if (target) {
        const img = new Image()
        img.src = target.panorama
      }
      walkToken.current += 1
      setWalk({
        token: walkToken.current,
        target: id,
        northFrom: sceneById(currentId)?.north || 0,
        northTo: target.north || 0,
      })
    },
    [currentId],
  )

  const handleWalkSwap = useCallback(() => {
    if (walkRef.current) setCurrentId(walkRef.current.target)
  }, [])

  const handleWalkDone = useCallback(() => {
    setWalk(null)
  }, [])

  // fullscreen handling
  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement) el.requestFullscreen?.()
    else document.exitFullscreen?.()
  }, [])

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // fade out the pose readout after a moment
  useEffect(() => {
    if (!pose) return
    const t = setTimeout(() => setPose(null), 4000)
    return () => clearTimeout(t)
  }, [pose])

  return (
    <div className="app">
      <Viewer
        scene={scene}
        autoRotate={autoRotate}
        onNavigate={navigate}
        onLoadingChange={setLoading}
        onPose={setPose}
        onPoseLive={aimMode ? handlePoseLive : undefined}
        walk={walk}
        onWalkSwap={handleWalkSwap}
        onWalkDone={handleWalkDone}
        editMode={editMode}
        activePlace={activePlace}
        overrides={overrides}
        onPlace={handlePlace}
      />

      {/* Top bar: title + room name */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-title">{tourInfo.title}</span>
          <span className="brand-sub">{tourInfo.subtitle}</span>
        </div>
        <div className="room-name">{scene.name}</div>
      </header>

      {/* Room quick-switcher */}
      <nav className="room-tabs">
        {scenes.map((s) => (
          <button
            key={s.id}
            className={`room-tab ${s.id === currentId ? 'active' : ''}`}
            onClick={() => navigate(s.id)}
          >
            {s.name}
          </button>
        ))}
      </nav>

      {/* Control buttons */}
      <div className="controls">
        <button
          className={`ctrl-btn ${autoRotate ? 'on' : ''}`}
          onClick={() => setAutoRotate((v) => !v)}
          title="Auto-rotate"
        >
          {autoRotate ? '⏸' : '⟳'}
        </button>
        <button className="ctrl-btn" onClick={toggleFullscreen} title="Fullscreen">
          {fullscreen ? '⤢' : '⛶'}
        </button>
        <button
          className={`ctrl-btn ${editMode ? 'on' : ''}`}
          onClick={() => {
            setEditMode((v) => !v)
            setAimMode(false)
          }}
          title="Edit rings — i-click ang sahig para ilagay ang ring"
        >
          ✎
        </button>
      </div>

      {/* Aim tool: crosshair + live yaw/dist readout for placing floor rings */}
      {aimMode && (
        <>
          <div className="crosshair" />
          <div className="aim-hud">
            <div className="aim-line" ref={hudRef}>
              yaw —° dist —
            </div>
            <div className="aim-help">
              Scene: <b>{scene.name}</b> — itutok ang + sa sahig kung saan mo gustong
              ilagay ang ring, tapos sabihin ang <b>yaw</b> at <b>dist</b>
            </div>
          </div>
        </>
      )}

      {/* Ring placement editor */}
      {editMode && (
        <div className="edit-panel">
          <div className="edit-title">✎ Ilagay ang mga ring — i-click ang SAHIG</div>
          <div className="edit-chips">
            {scene.hotspots?.map((h) => {
              const placed = !!overrides[`${scene.id}:${h.target}`]
              return (
                <button
                  key={h.target}
                  className={`edit-chip ${activePlace === h.target ? 'active' : ''}`}
                  onClick={() => setActivePlace(h.target)}
                >
                  → {h.label || h.target} {placed && <span className="edit-check">✓</span>}
                </button>
              )
            })}
          </div>
          <div className="edit-help">
            Piliin ang ring sa taas, tapos <b>i-click ang sahig</b> kung saan ilalagay. Auto-save
            (maaalala kahit i-refresh).
          </div>
          <div className="edit-values">
            {scene.hotspots?.map((h) => {
              const o = overrides[`${scene.id}:${h.target}`]
              return (
                <div key={h.target}>
                  {h.target}: {o ? `yaw ${o.yaw}, dist ${o.dist}` : '(default)'}
                </div>
              )
            })}
          </div>
          <div className="edit-actions">
            <button onClick={resetScene}>↺ Reset kwartong ito</button>
          </div>
        </div>
      )}

      <FloorplanMap currentId={currentId} onNavigate={navigate} />

      {/* Hint (first-load) */}
      {!editMode && (
        <div className="hint">
          <span>🖱 Drag to look around · Scroll to zoom · Click the glowing dots to move</span>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="loader">
          <div className="spinner" />
          <span>Loading 360°…</span>
        </div>
      )}

      {/* Pose debug readout (press P) */}
      {pose && (
        <div className="pose">
          yaw: <b>{pose.yaw}</b>&deg; &nbsp; pitch: <b>{pose.pitch}</b>&deg;
          <span className="pose-hint">← copy into tour.config.js hotspot</span>
        </div>
      )}
    </div>
  )
}
