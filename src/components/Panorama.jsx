import { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FADE_SPEED = 5.0 // crossfade speed

// Room box (the capture point / camera sits at the origin). Floor is farther than the
// ceiling to match real eye height. Because the surfaces are at FINITE distances,
// moving the camera produces real PARALLAX (near floor sweeps past faster than far
// walls) — a much closer approximation of Matterport's walk than an infinite sphere.
export const ROOM = { halfX: 5.6, halfZ: 7.2, floor: -2.6, ceil: 2.2 }

let _geo = null
function roomGeometry() {
  if (_geo) return _geo
  const W = ROOM.halfX * 2
  const D = ROOM.halfZ * 2
  const H = ROOM.ceil - ROOM.floor
  const geo = new THREE.BoxGeometry(W, H, D, 40, 24, 52)
  geo.translate(0, (ROOM.ceil + ROOM.floor) / 2, 0)

  // Re-project UVs so the equirectangular panorama maps by DIRECTION from the origin
  // (identical to the sphere mapping, so looking around is undistorted). Uses a
  // non-indexed copy so seam triangles can be fixed without corrupting neighbours.
  const src = geo.toNonIndexed()
  const pos = src.attributes.position
  const uvs = new Float32Array(pos.count * 2)
  const v = new THREE.Vector3()
  const uOf = (x, y, z) => {
    v.set(x, y, z).normalize()
    // negated so the photo reads un-mirrored from inside the box (viewed on BackSide)
    let A = Math.atan2(-v.z, -v.x)
    if (A < 0) A += Math.PI * 2
    return A / (Math.PI * 2)
  }
  const vOf = (x, y, z) => {
    v.set(x, y, z).normalize()
    return 1 - Math.acos(THREE.MathUtils.clamp(v.y, -1, 1)) / Math.PI
  }
  for (let t = 0; t < pos.count; t += 3) {
    let u0 = uOf(pos.getX(t), pos.getY(t), pos.getZ(t))
    let u1 = uOf(pos.getX(t + 1), pos.getY(t + 1), pos.getZ(t + 1))
    let u2 = uOf(pos.getX(t + 2), pos.getY(t + 2), pos.getZ(t + 2))
    // fix the wrap seam: if a triangle straddles u=0/1, pull the low ones up
    const max = Math.max(u0, u1, u2)
    if (max - Math.min(u0, u1, u2) > 0.5) {
      if (u0 < 0.5) u0 += 1
      if (u1 < 0.5) u1 += 1
      if (u2 < 0.5) u2 += 1
    }
    uvs[(t + 0) * 2] = u0
    uvs[(t + 1) * 2] = u1
    uvs[(t + 2) * 2] = u2
    uvs[(t + 0) * 2 + 1] = vOf(pos.getX(t), pos.getY(t), pos.getZ(t))
    uvs[(t + 1) * 2 + 1] = vOf(pos.getX(t + 1), pos.getY(t + 1), pos.getZ(t + 1))
    uvs[(t + 2) * 2 + 1] = vOf(pos.getX(t + 2), pos.getY(t + 2), pos.getZ(t + 2))
  }
  src.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.dispose()
  _geo = src
  return src
}

/**
 * Renders the 360° panorama on a finite room-box (for walk parallax) and crossfades
 * between panoramas on scene change.
 */
export default function Panorama({ url, onLoadingChange }) {
  const { gl } = useThree()
  const matA = useRef()
  const matB = useRef()
  const active = useRef('A')
  const fade = useRef(1)
  const first = useRef(true)

  useEffect(() => {
    let cancelled = false
    onLoadingChange?.(true)
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.wrapS = THREE.RepeatWrapping // so seam-fixed UVs (>1) sample correctly
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.anisotropy = gl.capabilities.getMaxAnisotropy()

        if (first.current) {
          first.current = false
          if (matA.current) {
            const old = matA.current.map
            matA.current.map = tex
            matA.current.opacity = 1
            matA.current.needsUpdate = true
            old?.dispose()
          }
          active.current = 'A'
          fade.current = 1
        } else {
          const incoming = active.current === 'A' ? matB : matA
          if (incoming.current) {
            const old = incoming.current.map
            incoming.current.map = tex
            incoming.current.opacity = 0
            incoming.current.needsUpdate = true
            old?.dispose()
          }
          active.current = active.current === 'A' ? 'B' : 'A'
          fade.current = 0
        }
        onLoadingChange?.(false)
      },
      undefined,
      (err) => {
        console.error('Panorama failed to load:', url, err)
        if (!cancelled) onLoadingChange?.(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [url, gl, onLoadingChange])

  useFrame((_, delta) => {
    if (fade.current < 1) fade.current = Math.min(1, fade.current + delta * FADE_SPEED)
    const a = matA.current
    const b = matB.current
    if (!a || !b) return
    if (active.current === 'A') {
      a.opacity = fade.current
      b.opacity = 1 - fade.current
    } else {
      b.opacity = fade.current
      a.opacity = 1 - fade.current
    }
  })

  const shared = {
    side: THREE.BackSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }

  return (
    <group>
      <mesh geometry={roomGeometry()} renderOrder={0}>
        <meshBasicMaterial ref={matA} {...shared} opacity={0} />
      </mesh>
      <mesh geometry={roomGeometry()} renderOrder={1}>
        <meshBasicMaterial ref={matB} {...shared} opacity={0} />
      </mesh>
    </group>
  )
}
