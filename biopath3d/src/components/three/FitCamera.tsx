import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls } from 'three-stdlib'

/** Moves the camera so an object of the given radius fills the view. */
export function FitCamera({ radius, deps = [] }: { radius: number; deps?: unknown[] }) {
  const { camera, controls } = useThree()
  useEffect(() => {
    const d = Math.max(4, radius * 3.2)
    camera.position.set(0, radius * 0.2, d)
    camera.near = Math.max(0.05, d / 200)
    camera.far = d * 20
    camera.updateProjectionMatrix()
    const c = controls as unknown as OrbitControls | null
    if (c) {
      c.target.set(0, 0, 0)
      c.maxDistance = d * 4
      c.update()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, camera, controls, ...deps])
  return null
}
