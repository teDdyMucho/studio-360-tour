import * as THREE from 'three'

/**
 * Convert (lon/yaw, lat/pitch) in DEGREES to a 3D point on a sphere of radius r.
 * Camera at origin looks along sph(lon, lat); a hotspot placed at sph(yaw, pitch, r)
 * therefore lands exactly on that view line — this is why the "P" debug readout
 * gives you copy-paste yaw/pitch values for aiming hotspots.
 *
 *   lon = 0   -> faces +Z (forward)
 *   lat = 0   -> horizon;  lat < 0 -> looking down toward the floor
 */
export function sph(lon, lat, r = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta),
  )
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// shortest signed angular distance a->b in degrees, result in (-180, 180]
export function shortestAngleDeg(a, b) {
  let d = (b - a) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}
