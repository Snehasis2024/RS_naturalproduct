import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'

export const CPK: Record<string, string> = {
  H: '#f1f5f9', C: '#9ca3af', N: '#3b82f6', O: '#ef4444', P: '#f97316', S: '#facc15', Fe: '#e67e22', Zn: '#7c8aa5', Mg: '#8aff00', Cl: '#1ff01f', F: '#90e050', Ca: '#3dff00', Na: '#ab5cf2', Cu: '#c88033', Mn: '#9c7ac7',
}
export const VDW: Record<string, number> = { H: 1.2, C: 1.7, N: 1.55, O: 1.52, P: 1.8, S: 1.8, Fe: 1.94, Zn: 1.39, Mg: 1.73, Cl: 1.75, F: 1.47, Ca: 2.31, Na: 2.27 }

export type Representation = 'ball-stick' | 'spacefill' | 'stick' | 'cartoon' | 'surface'

export interface AtomLike {
  el: string
  x: number
  y: number
  z: number
}

/** Instanced atoms + bonds. Handles small molecules and protein subsets. */
export function AtomsAndBonds({
  atoms,
  bonds,
  rep,
  carbonColor,
  uniformColor,
  highlight,
  opacity = 1,
  onAtom,
  glow = 0.15,
}: {
  atoms: AtomLike[]
  bonds: [number, number, number?][]
  rep: 'ball-stick' | 'spacefill' | 'stick' | 'surface'
  carbonColor?: string
  /** Paint every atom one colour (e.g. per-chain surfaces). */
  uniformColor?: string
  highlight?: boolean
  opacity?: number
  onAtom?: (i: number, e: ThreeEvent<MouseEvent>) => void
  glow?: number
}) {
  const atomRef = useRef<THREE.InstancedMesh>(null)
  const bondRef = useRef<THREE.InstancedMesh>(null)
  const radius = (el: string) =>
    rep === 'spacefill' ? VDW[el] ?? 1.7 : rep === 'surface' ? (VDW[el] ?? 1.7) + 1.1 : rep === 'stick' ? 0.16 : 0.18 + (VDW[el] ?? 1.7) * 0.14
  const bondR = rep === 'stick' ? 0.16 : 0.09
  const showBonds = rep === 'ball-stick' || rep === 'stick'

  useLayoutEffect(() => {
    const im = atomRef.current
    if (!im) return
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    atoms.forEach((a, i) => {
      const r = radius(a.el)
      m.makeScale(r, r, r).setPosition(a.x, a.y, a.z)
      im.setMatrixAt(i, m)
      c.set(uniformColor ?? (a.el === 'C' && carbonColor ? carbonColor : CPK[a.el] ?? '#ff69b4'))
      im.setColorAt(i, c)
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atoms, rep, carbonColor, uniformColor])

  useLayoutEffect(() => {
    const im = bondRef.current
    if (!im || !showBonds) return
    const up = new THREE.Vector3(0, 1, 0)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const c = new THREE.Color()
    let k = 0
    for (const [i, j] of bonds) {
      const a = new THREE.Vector3(atoms[i].x, atoms[i].y, atoms[i].z)
      const b = new THREE.Vector3(atoms[j].x, atoms[j].y, atoms[j].z)
      const mid = a.clone().lerp(b, 0.5)
      for (const [from, to, el] of [[a, mid, atoms[i].el], [mid, b, atoms[j].el]] as [THREE.Vector3, THREE.Vector3, string][]) {
        const d = to.clone().sub(from)
        const len = d.length()
        q.setFromUnitVectors(up, d.normalize())
        m.compose(from.clone().lerp(to, 0.5), q, new THREE.Vector3(bondR, len, bondR))
        im.setMatrixAt(k, m)
        c.set(el === 'C' && carbonColor ? carbonColor : CPK[el] ?? '#ff69b4')
        im.setColorAt(k, c)
        k++
      }
    }
    im.count = k
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
  }, [atoms, bonds, rep, carbonColor, showBonds, bondR])

  const segs = atoms.length > 3000 ? 8 : 16
  return (
    <group>
      <instancedMesh
        ref={atomRef}
        args={[undefined, undefined, atoms.length]}
        onClick={onAtom ? (e) => { e.stopPropagation(); if (e.instanceId !== undefined) onAtom(e.instanceId, e) } : undefined}
      >
        <sphereGeometry args={[1, segs, Math.round(segs * 0.75)]} />
        <meshStandardMaterial
          roughness={rep === 'surface' ? 0.6 : 0.35}
          metalness={0.05}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity > 0.6}
          emissive={highlight ? '#22d3ee' : '#000000'}
          emissiveIntensity={highlight ? 0.35 : glow}
        />
      </instancedMesh>
      {showBonds && (
        <instancedMesh ref={bondRef} args={[undefined, undefined, Math.max(1, bonds.length * 2)]} raycast={() => null}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial roughness={0.4} transparent={opacity < 1} opacity={opacity} emissive={highlight ? '#22d3ee' : '#000'} emissiveIntensity={highlight ? 0.3 : 0} />
        </instancedMesh>
      )}
    </group>
  )
}

/** Small molecule from the conformer library, centred, with optional hydrogens. */
export function SmallMoleculeModel({
  mol,
  rep = 'ball-stick',
  showH = true,
  scale = 1,
}: {
  mol: { atoms: [string, number, number, number][]; bonds: [number, number, number][] }
  rep?: 'ball-stick' | 'spacefill' | 'stick' | 'surface'
  showH?: boolean
  scale?: number
}) {
  const { atoms, bonds } = useMemo(() => {
    const keep = mol.atoms.map((a, i) => [a, i] as const).filter(([a]) => showH || a[0] !== 'H')
    const remap = new Map(keep.map(([, i], k) => [i, k]))
    return {
      atoms: keep.map(([a]) => ({ el: a[0], x: a[1], y: a[2], z: a[3] })),
      bonds: mol.bonds.filter(([i, j]) => remap.has(i) && remap.has(j)).map(([i, j, o]) => [remap.get(i)!, remap.get(j)!, o] as [number, number, number]),
    }
  }, [mol, showH])
  return (
    <group scale={scale}>
      <AtomsAndBonds atoms={atoms} bonds={bonds} rep={rep} />
    </group>
  )
}
