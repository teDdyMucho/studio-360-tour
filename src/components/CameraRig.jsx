import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sph, clamp, shortestAngleDeg } from '../three/sph.js'

const MIN_FOV = 35
const MAX_FOV = 82
const DEFAULT_FOV = 74
const DRAG_SPEED = 0.12
// touch: a full-width swipe pans ~170°, so one thumb-flick turns you around
const TOUCH_SWIPE_DEG = 170
const DAMP = 6
const FLING_DAMP = 4 // deg/s decay rate of the fling after a touch release
const AUTOROTATE_SPEED = 3 // degrees / second

// "walk" transition: a smooth glide forward into the next room, keeping your
// viewing direction continuous (panoramas are aligned via each scene's `north`).
const WALK_DUR = 1.0 // seconds — a clear, deliberate step
// forward glide in ROOM-BOX units (room half-depth ~5.6). Moving this far in a finite
// room produces real parallax (near floor sweeps past faster than far walls).
const MOVE_DIST = 1.2
const SWAP_AT = 0.55 // crossfade just past the peak of the glide
const MAX_DT = 0.04 // clamp per-frame time so a hitch can never skip the whole glide

/**
 * Panorama look-around controller.
 *  - drag (mouse / touch) to rotate the view 360°
 *  - wheel / pinch to zoom (changes FOV)
 *  - auto-rotate when idle (toggleable)
 *  - press "P" to print current yaw/pitch (for aiming hotspots)
 *
 * `poseKey` changes whenever we want to re-aim the camera (e.g. new scene);
 * `targetYaw` is the yaw to ease toward on that change.
 */
export default function CameraRig({
  autoRotate,
  poseKey,
  targetYaw = 0,
  onPose,
  onPoseLive,
  walk,
  onWalkSwap,
  onWalkDone,
}) {
  const { camera, gl } = useThree()
  const dom = gl.domElement

  const state = useRef({
    lon: targetYaw,
    lat: 0,
    targetLon: targetYaw,
    targetLat: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    pointers: new Map(),
    pinchDist: 0,
    velLon: 0,
    velLat: 0,
    lastMoveT: 0,
    userInteracting: false,
    walking: false,
    walkElapsed: 0,
    arriveYaw: 0,
    swapped: false,
  })

  // re-aim on scene change (but never fight an in-progress walk)
  useEffect(() => {
    const s = state.current
    if (s.walking) return
    s.targetLon = targetYaw
    s.targetLat = 0
    s.lon = targetYaw
    s.lat = 0
  }, [poseKey, targetYaw])

  // start a walk transition
  useEffect(() => {
    if (!walk) return
    const s = state.current
    s.walking = true
    s.walkElapsed = 0
    s.swapped = false
    s.userInteracting = true
    s.northFrom = walk.northFrom || 0
    s.northTo = walk.northTo || 0
    // preserved GLOBAL heading (stays constant as we cross into the next room)
    s.global = s.lon - s.northFrom
    // fixed world direction to glide along (where we're currently looking)
    s.glide = sph(s.lon, 0, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walk?.token])

  useEffect(() => {
    camera.fov = DEFAULT_FOV
    camera.updateProjectionMatrix()
  }, [camera])

  useEffect(() => {
    const s = state.current

    const onDown = (e) => {
      dom.setPointerCapture?.(e.pointerId)
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      s.dragging = true
      s.userInteracting = true
      s.lastX = e.clientX
      s.lastY = e.clientY
      s.velLon = 0 // grabbing the view stops any in-flight fling
      s.velLat = 0
      s.lastMoveT = performance.now()
      if (s.pointers.size === 2) {
        const pts = [...s.pointers.values()]
        s.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      }
    }

    const onMove = (e) => {
      if (!s.pointers.has(e.pointerId)) return
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (s.pointers.size === 2) {
        const pts = [...s.pointers.values()]
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        if (s.pinchDist) {
          const delta = (s.pinchDist - dist) * 0.1
          camera.fov = clamp(camera.fov + delta, MIN_FOV, MAX_FOV)
          camera.updateProjectionMatrix()
        }
        s.pinchDist = dist
        return
      }

      if (!s.dragging) return
      const dx = e.clientX - s.lastX
      const dy = e.clientY - s.lastY
      s.lastX = e.clientX
      s.lastY = e.clientY
      const speed =
        e.pointerType === 'touch'
          ? Math.max(DRAG_SPEED, TOUCH_SWIPE_DEG / dom.clientWidth)
          : DRAG_SPEED
      const factor = (camera.fov / DEFAULT_FOV) * speed
      s.targetLon -= dx * factor
      s.targetLat = clamp(s.targetLat + dy * factor, -85, 85)

      // track velocity (deg/s, smoothed) so releasing mid-swipe flings the view
      const now = performance.now()
      const dt = Math.max((now - s.lastMoveT) / 1000, 1 / 240)
      s.lastMoveT = now
      s.velLon = s.velLon * 0.7 + (-dx * factor) / dt * 0.3
      s.velLat = s.velLat * 0.7 + (dy * factor) / dt * 0.3
    }

    const onUp = (e) => {
      s.pointers.delete(e.pointerId)
      dom.releasePointerCapture?.(e.pointerId)
      if (s.pointers.size < 2) s.pinchDist = 0
      if (s.pointers.size === 0) {
        s.dragging = false
        // fling only if the finger was still moving at release
        if (performance.now() - s.lastMoveT > 90) {
          s.velLon = 0
          s.velLat = 0
        }
        // allow auto-rotate to resume a moment after release
        setTimeout(() => (s.userInteracting = false), 2500)
      }
    }

    const onWheel = (e) => {
      e.preventDefault()
      camera.fov = clamp(camera.fov + e.deltaY * 0.03, MIN_FOV, MAX_FOV)
      camera.updateProjectionMatrix()
      s.userInteracting = true
      setTimeout(() => (s.userInteracting = false), 2500)
    }

    const onKey = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        const yaw = ((s.lon % 360) + 360) % 360
        onPose?.({ yaw: Math.round(yaw), pitch: Math.round(s.lat) })
      }
    }

    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    dom.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dom.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [dom, camera, onPose])

  useFrame((_, delta) => {
    const s = state.current

    // ---- walk transition: glide forward, keeping the viewing direction continuous ----
    if (s.walking) {
      s.walkElapsed += Math.min(delta, MAX_DT)
      const p = Math.min(1, s.walkElapsed / WALK_DUR)
      s.lat = THREE.MathUtils.damp(s.lat, 0, 8, delta)
      // look direction = preserved global heading mapped into the currently-shown scene
      s.lon = s.global + (s.swapped ? s.northTo : s.northFrom)
      // smooth forward bump: 0 -> max -> 0 (position uses a FIXED glide dir, so the
      // heading realignment at the swap never pops the camera position)
      const offset = Math.sin(p * Math.PI) * MOVE_DIST
      camera.position.set(s.glide.x * offset, 0, s.glide.z * offset)
      const look = sph(s.lon, s.lat, 100)
      camera.lookAt(camera.position.x + look.x, camera.position.y + look.y, camera.position.z + look.z)

      if (p >= SWAP_AT && !s.swapped) {
        s.swapped = true
        onWalkSwap?.() // crossfade to the destination panorama at the peak
      }
      if (p >= 1) {
        s.walking = false
        s.lon = s.global + s.northTo
        s.targetLon = s.lon
        s.targetLat = 0
        camera.position.set(0, 0, 0)
        setTimeout(() => (s.userInteracting = false), 1200)
        onWalkDone?.()
      }
      if (typeof window !== 'undefined') window.__tourLon = ((s.lon % 360) + 360) % 360
      return
    }

    if (autoRotate && !s.userInteracting) {
      s.targetLon += AUTOROTATE_SPEED * delta
    }

    // touch fling: keep coasting after release, decaying smoothly
    if (!s.dragging && (Math.abs(s.velLon) > 0.5 || Math.abs(s.velLat) > 0.5)) {
      s.targetLon += s.velLon * delta
      s.targetLat = clamp(s.targetLat + s.velLat * delta, -85, 85)
      const decay = Math.exp(-FLING_DAMP * delta)
      s.velLon *= decay
      s.velLat *= decay
    }
    s.lon = THREE.MathUtils.damp(s.lon, s.targetLon, DAMP, delta)
    s.lat = THREE.MathUtils.damp(s.lat, s.targetLat, DAMP, delta)
    camera.position.set(0, 0, 0)
    camera.lookAt(sph(s.lon, s.lat, 100))
    if (typeof window !== 'undefined') window.__tourLon = ((s.lon % 360) + 360) % 360

    if (onPoseLive) {
      const yaw = Math.round((((s.lon % 360) + 360) % 360) * 10) / 10
      const pitch = Math.round(s.lat * 10) / 10
      // dist that would place a floor ring exactly where the crosshair points
      const dist = pitch < -2 ? Math.round((2.6 / Math.tan(THREE.MathUtils.degToRad(-pitch))) * 10) / 10 : null
      onPoseLive(yaw, pitch, dist)
    }
  })

  return null
}
