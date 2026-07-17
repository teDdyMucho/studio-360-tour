import { useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FLOOR_Y = -2.6
const DEFAULT_DIST = 3.3

// Matterport-style ring texture: soft white donut + a small green direction chevron.
// Built once from a <canvas> and shared by every hotspot (direction is set per-ring
// by rotating the group, so one texture works for all).
let _ringTex = null
function ringTexture() {
  if (_ringTex) return _ringTex
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')
  const cx = s / 2
  const cy = s / 2

  // soft translucent fill
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.42)
  g.addColorStop(0, 'rgba(255,255,255,0.30)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2)
  ctx.fill()

  // main white ring
  ctx.strokeStyle = 'rgba(255,255,255,0.96)'
  ctx.lineWidth = s * 0.045
  ctx.beginPath()
  ctx.arc(cx, cy, s * 0.36, 0, Math.PI * 2)
  ctx.stroke()

  // green direction chevron pointing "up" (toward travel direction)
  ctx.strokeStyle = '#8dff5a'
  ctx.lineWidth = s * 0.055
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const a = s * 0.12
  ctx.beginPath()
  ctx.moveTo(cx - a, cy + a * 0.45)
  ctx.lineTo(cx, cy - a * 0.65)
  ctx.lineTo(cx + a, cy + a * 0.45)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  _ringTex = tex
  return tex
}

/**
 * A floor navigation ring (Matterport style). Lies flat on the ground; the group is
 * rotated so the green chevron points in the direction of travel (away from camera).
 * Tap/click to walk there.
 */
export default function Hotspot({ yaw, dist = DEFAULT_DIST, label, onClick, interactive = true }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const down = useRef(null)

  const yawRad = THREE.MathUtils.degToRad(yaw)
  const x = Math.sin(yawRad) * dist
  const z = Math.cos(yawRad) * dist
  // rotate the flat ring so its chevron (canvas "up") points along +yaw (away from camera)
  const faceRad = THREE.MathUtils.degToRad(yaw + 180)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 2.4) * 0.05
    const target = (hovered ? 1.28 : 1) * pulse
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, target, 0.15)
    groupRef.current.scale.set(s, s, s)
  })

  return (
    <group
      ref={groupRef}
      position={[x, FLOOR_Y, z]}
      rotation={[0, faceRad, 0]}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation()
              setHovered(true)
              document.body.style.cursor = 'pointer'
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              setHovered(false)
              document.body.style.cursor = 'grab'
            }
          : undefined
      }
      onPointerDown={
        interactive
          ? (e) => {
              down.current = { x: e.clientX, y: e.clientY }
            }
          : undefined
      }
      onPointerUp={
        interactive
          ? (e) => {
              if (down.current) {
                const moved = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y)
                if (moved < 6) onClick?.()
                down.current = null
              }
            }
          : undefined
      }
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial
          map={ringTexture()}
          transparent
          opacity={hovered ? 1 : 0.9}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {label && hovered && (
        <Html position={[0, 0.9, 0]} center zIndexRange={[15, 0]} pointerEvents="none">
          <div className="hotspot-label show">{label}</div>
        </Html>
      )}
    </group>
  )
}
