import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Sparse, slowly drifting background particles (represents the crowded aqueous milieu). */
export function MolecularDust({ count = 700, radius = 60 }: { count?: number; radius?: number }) {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const palette = [new THREE.Color('#22d3ee'), new THREE.Color('#a78bfa'), new THREE.Color('#60a5fa')]
    for (let i = 0; i < count; i++) {
      const r = radius * (0.5 + Math.random() * 0.5)
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      p.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3)
      const col = palette[i % 3]
      c.set([col.r, col.g, col.b], i * 3)
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g
  }, [count, radius])
  const sprite = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01
  })
  return (
    <points ref={ref} geometry={geo} raycast={() => null}>
      <pointsMaterial size={0.35} map={sprite} vertexColors transparent opacity={0.55} depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  )
}
