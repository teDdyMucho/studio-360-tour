import { useRef } from 'react'
import * as THREE from 'three'

const FLOOR_Y = -2.6

/**
 * Edit-mode helper: a large invisible disc lying on the floor. Clicking it computes
 * the exact yaw/dist of that floor point so a ring can be dropped precisely where the
 * user clicks (no more guessing). Dragging to look around does not place.
 */
export default function FloorEditor({ active, onPlace }) {
  const down = useRef(null)
  if (!active) return null

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y, 0]}
      renderOrder={2}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        if (!down.current) return
        const moved = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y)
        down.current = null
        if (moved > 6) return // was a drag, not a click
        const p = e.point
        const yaw = (THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z)) + 360) % 360
        const dist = THREE.MathUtils.clamp(Math.hypot(p.x, p.z), 1.5, 8)
        onPlace(yaw, dist)
      }}
    >
      <circleGeometry args={[80, 64]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
