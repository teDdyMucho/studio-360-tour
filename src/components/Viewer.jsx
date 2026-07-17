import { Canvas } from '@react-three/fiber'
import Panorama from './Panorama.jsx'
import Hotspot from './Hotspot.jsx'
import CameraRig from './CameraRig.jsx'
import FloorEditor from './FloorEditor.jsx'

/**
 * The WebGL stage: panorama sphere + look-around camera + navigation hotspots
 * for the current scene. In edit mode, a floor plane lets you click to place rings.
 */
export default function Viewer({
  scene,
  autoRotate,
  onNavigate,
  onLoadingChange,
  onPose,
  onPoseLive,
  walk,
  onWalkSwap,
  onWalkDone,
  editMode,
  activePlace,
  overrides,
  onPlace,
}) {
  return (
    <Canvas
      className="viewer-canvas"
      camera={{ fov: 74, near: 0.1, far: 1100, position: [0, 0, 0.01] }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
    >
      <Panorama url={scene.panorama} onLoadingChange={onLoadingChange} />

      <CameraRig
        autoRotate={autoRotate && !editMode}
        poseKey={scene.id}
        targetYaw={scene.initialYaw || 0}
        onPose={onPose}
        onPoseLive={onPoseLive}
        walk={walk}
        onWalkSwap={onWalkSwap}
        onWalkDone={onWalkDone}
      />

      {scene.hotspots?.map((h, i) => {
        const ov = overrides?.[`${scene.id}:${h.target}`]
        return (
          <Hotspot
            key={`${scene.id}-${i}`}
            yaw={ov ? ov.yaw : h.yaw}
            dist={ov ? ov.dist : h.dist}
            label={h.label}
            interactive={!editMode}
            onClick={() => onNavigate(h.target, h.yaw, h.arriveYaw)}
          />
        )
      })}

      <FloorEditor active={editMode && !!activePlace} onPlace={onPlace} />
    </Canvas>
  )
}
