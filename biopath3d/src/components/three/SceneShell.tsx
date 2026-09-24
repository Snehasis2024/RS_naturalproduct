import { Canvas } from '@react-three/fiber'
import { OrbitControls, AdaptiveDpr } from '@react-three/drei'
import { Suspense, type ReactNode } from 'react'
import { MolecularDust } from './MolecularDust'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export interface SceneShellProps {
  children: ReactNode
  camera?: [number, number, number]
  fov?: number
  target?: [number, number, number]
  autoRotate?: boolean
  dust?: boolean
  controls?: boolean
  minDistance?: number
  maxDistance?: number
  onMissed?: () => void
  controlsRef?: React.Ref<OrbitControlsImpl>
  className?: string
  fog?: boolean
}

/** Shared R3F canvas: lab lighting, background dust, orbit/zoom/pan controls. */
export function SceneShell({
  children,
  camera = [0, 0, 14],
  fov = 45,
  target = [0, 0, 0],
  autoRotate = false,
  dust = true,
  controls = true,
  minDistance = 2,
  maxDistance = 60,
  onMissed,
  controlsRef,
  className,
  fog = true,
}: SceneShellProps) {
  return (
    <div className={className ?? 'absolute inset-0'}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: camera, fov, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={onMissed}
      >
        <color attach="background" args={['#050a18']} />
        {fog && <fog attach="fog" args={['#050a18', 60, 170]} />}
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#7dd3fc', '#1e1b4b', 0.55]} />
        <directionalLight position={[8, 12, 10]} intensity={1.4} color="#e0f2fe" />
        <directionalLight position={[-10, -6, -8]} intensity={0.6} color="#a78bfa" />
        <pointLight position={[0, 0, 0]} intensity={8} distance={14} color="#22d3ee" />
        <Suspense fallback={null}>{children}</Suspense>
        {dust && <MolecularDust />}
        {controls && (
          <OrbitControls
            ref={controlsRef}
            makeDefault
            target={target}
            enableDamping
            dampingFactor={0.08}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            minDistance={minDistance}
            maxDistance={maxDistance}
          />
        )}
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  )
}
