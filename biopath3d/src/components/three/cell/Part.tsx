import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePartState, useCell } from './context'
import { Label3D } from '../Label3D'
import { ORGANELLES } from '../../../data/organelles'

const NAMES = Object.fromEntries(ORGANELLES.map((o) => [o.id, o.name]))

/**
 * Wraps an organelle (or one instance of it): tags meshes for picking,
 * applies hover/selection/dim/transparent styling, animates explode-view.
 */
export function Part({
  id,
  children,
  dir = [0, 0, 0],
  scaleOnExplode = 0,
  label,
  showLabel = true,
}: {
  id: string
  children: ReactNode
  dir?: [number, number, number]
  scaleOnExplode?: number
  label?: [number, number, number]
  showLabel?: boolean
}) {
  const ref = useRef<THREE.Group>(null)
  const state = usePartState(id)
  const { explode, transparent, labels } = useCell()

  useEffect(() => {
    const g = ref.current
    if (!g) return
    g.userData.part = id
    g.visible = state !== 'hidden'
    const glow = state === 'selected' ? 0.85 : state === 'hover' ? 0.5 : null
    const dimK = state === 'dim' ? 0.22 : 1
    const tK = transparent && state !== 'selected' && state !== 'hover' ? 0.4 : 1
    g.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        const ud = m.userData as { baseOpacity?: number; baseEmissive?: number }
        ud.baseOpacity ??= m.opacity ?? 1
        if (m instanceof THREE.ShaderMaterial && m.uniforms.uOpacity) {
          m.uniforms.uOpacity.value = (ud.baseOpacity ?? 1) * dimK * (state === 'selected' || state === 'hover' ? 1.8 : 1)
          continue
        }
        const sm = m as THREE.MeshStandardMaterial
        if (sm.emissiveIntensity !== undefined) {
          ud.baseEmissive ??= sm.emissiveIntensity
          sm.emissiveIntensity = glow ?? ud.baseEmissive
        }
        const target = ud.baseOpacity * dimK * tK
        m.transparent = target < 0.999 || ud.baseOpacity < 0.999
        m.opacity = target
        m.depthWrite = target > 0.55
        m.needsUpdate = true
      }
    })
  }, [state, transparent, id])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const k = 1 - Math.exp(-dt * 6)
    g.position.x += (dir[0] * explode - g.position.x) * k
    g.position.y += (dir[1] * explode - g.position.y) * k
    g.position.z += (dir[2] * explode - g.position.z) * k
    const s = 1 + scaleOnExplode * explode
    g.scale.setScalar(g.scale.x + (s - g.scale.x) * k)
  })

  return (
    <group ref={ref}>
      {children}
      {labels && showLabel && label && state !== 'hidden' && (
        <Label3D position={label} text={NAMES[id] ?? id} hot={state === 'hover' || state === 'selected'} dim={state === 'dim'} />
      )}
    </group>
  )
}

/** Find the organelle id behind a pointer event, preferring interior parts over the membrane shell. */
export function pickPart(intersections: THREE.Intersection[]): string | null {
  // Large enveloping structures (ER sheets, ribosome cloud, membrane) yield to discrete organelles behind them.
  const rank = (id: string) => (id === 'membrane' || id === 'cytoplasm' ? 3 : id === 'ribosomes' ? 2 : id === 'er' ? 1 : 0)
  let best: { id: string; r: number } | null = null
  for (const hit of intersections) {
    let o: THREE.Object3D | null = hit.object
    let visible = true
    let part: string | null = null
    while (o) {
      if (!o.visible) visible = false
      if (!part && o.userData.part) part = o.userData.part
      o = o.parent
    }
    if (!visible || !part) continue
    const r = rank(part)
    if (r === 0) return part
    if (!best || r < best.r) best = { id: part, r }
  }
  return best?.id ?? null
}
