import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { tick, smooth, lerp, clamp01, type SimClock } from '../engine/clock'
import { phaseAt, phaseIndex } from '../engine/cellCycleTimeline'
import { fresnelMaterial, prng, std } from '../components/three/cell/materials'
import { Centriole } from '../components/three/cell/Organelles'
import { DynamicLabel } from '../components/three/Label3D'

const R = 3 // cell radius
const RN = 0.45 * R // nucleus radius

/** Two homologous pairs (2n = 4 teaching karyotype). */
const CHROMS = [
  { color: '#f472b6', len: 0.62, name: 'Chromosome 1 (maternal)' },
  { color: '#60a5fa', len: 0.62, name: 'Chromosome 1 (paternal)' },
  { color: '#fbbf24', len: 0.4, name: 'Chromosome 2 (maternal)' },
  { color: '#2dd4bf', len: 0.4, name: 'Chromosome 2 (paternal)' },
]
const TERRITORY = [
  new THREE.Vector3(-0.4, 0.3, 0.15),
  new THREE.Vector3(0.35, 0.35, -0.2),
  new THREE.Vector3(-0.3, -0.35, -0.2),
  new THREE.Vector3(0.35, -0.3, 0.25),
].map((v) => v.multiplyScalar(RN))
const PLATE = [0, 1, 2, 3].map((i) => {
  const a = (i * Math.PI) / 2 + Math.PI / 4
  return new THREE.Vector3(0, Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3)
})

/** Everything that depends on time t, computed once per frame. */
function stateAt(t: number) {
  const { phase, p, index } = phaseAt(t)
  const I = (id: string) => phaseIndex(id)
  const before = (id: string) => index < I(id)
  const after = (id: string) => index > I(id)
  const is = (id: string) => phase.id === id
  const growth = is('G0') ? 0 : is('G1') ? p : 1
  const scale = is('G0') ? 0.86 : is('G1') ? lerp(0.86, 1, p) : is('S') ? lerp(1, 1.05, p) : is('G2') ? lerp(1.05, 1.1, p) : 1.1
  const replicated = before('S') ? 0 : is('S') ? p : 1
  const condensed = before('prophase') ? 0 : is('prophase') ? smooth(p) : before('telophase') ? 1 : is('telophase') ? 1 - smooth(p * 1.3) : 0
  const envelope = before('prometaphase') ? 1 : is('prometaphase') ? 1 - smooth(p * 1.6) : 0
  const fragments = is('prometaphase') ? p : 0
  const daughterNuclei = is('telophase') ? smooth(p) : is('cytokinesis') ? 1 : 0
  // spindle pole x-position
  const poleX = before('prometaphase') ? 0.72 * R : is('anaphase') ? lerp(0.72, 0.95, smooth(p)) * R : after('anaphase') ? 0.95 * R : 0.72 * R
  const sep = before('anaphase') ? 0 : is('anaphase') ? lerp(0, 0.3, smooth(p)) * R : is('telophase') ? lerp(0.3, 0.6, smooth(p)) * R : is('cytokinesis') ? lerp(0.6, 1.2, smooth(p)) * R : 0
  const spindle = before('prophase') ? 0 : is('prophase') ? smooth(p) * 0.6 : is('telophase') ? 1 - smooth(p) : is('cytokinesis') ? 0 : 1
  const centrosomeSplit = before('prophase') ? 0 : is('prophase') ? smooth(p) : 1
  const centrosomeDup = before('S') ? 0 : is('S') ? smooth(p) : 1
  const toPlate = before('prometaphase') ? 0 : is('prometaphase') ? smooth(p) : 1
  const separate = before('anaphase') ? 0 : is('anaphase') ? smooth(p) : 1
  const ring = is('anaphase') ? smooth((p - 0.6) / 0.4) : is('telophase') || is('cytokinesis') ? 1 : 0
  const cilium = is('G0') ? 1 : is('G1') ? 1 - smooth(p * 2) : 0
  return { phase, p, index, growth, scale, replicated, condensed, envelope, fragments, daughterNuclei, poleX, sep, spindle, centrosomeSplit, centrosomeDup, toPlate, separate, ring, cilium, is }
}

export type CCPick = { type: 'chromosome'; index: number } | { type: 'spindle' | 'centrosome' | 'envelope' | 'ring' }

function tagged(e: ThreeEvent<MouseEvent | PointerEvent>): CCPick | null {
  const order = ['chromosome', 'centrosome', 'ring', 'envelope', 'spindle']
  let best: { rank: number; pick: CCPick } | null = null
  for (const hit of e.intersections) {
    let o: THREE.Object3D | null = hit.object
    let visible = true
    let tag: string | undefined
    while (o) {
      if (!o.visible) visible = false
      tag ??= o.userData.cc
      o = o.parent
    }
    if (!visible || !tag) continue
    const [type, idx] = tag.split(':')
    const rank = order.indexOf(type)
    if (rank < 0) continue
    if (!best || rank < best.rank) best = { rank, pick: type === 'chromosome' ? { type: 'chromosome', index: +idx } : ({ type } as CCPick) }
  }
  return best?.pick ?? null
}

export function CellCycleScene({
  clock,
  onPick,
  selected,
  labels = true,
}: {
  clock: React.RefObject<SimClock>
  onPick?: (p: CCPick | null) => void
  selected?: CCPick | null
  labels?: boolean
}) {
  // ------------------------------------------------ static geometry & materials
  const memMats = useMemo(() => [fresnelMaterial('#38bdf8', 2.2, 1.2), fresnelMaterial('#38bdf8', 2.2, 1.2)], [])
  const cytoMat = useMemo(() => std('#0e7490', { transparent: true, opacity: 0.07, side: THREE.BackSide, depthWrite: false }), [])
  const envMat = useMemo(() => std('#7c3aed', { transparent: true, opacity: 0.4, side: THREE.DoubleSide, emissiveIntensity: 0.25, depthWrite: false }), [])
  const nucleolusMat = useMemo(() => std('#f0abfc', { transparent: true, emissiveIntensity: 0.3 }), [])
  const ringMat = useMemo(() => std('#ef4444', { emissiveIntensity: 0.9, transparent: true }), [])
  const pcmMat = useMemo(() => std('#22d3ee', { transparent: true, opacity: 0.25, emissiveIntensity: 0.8, depthWrite: false }), [])
  const hitMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [])
  const mtMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.55 }), [])
  const cilMat = useMemo(() => std('#a5f3fc', { emissiveIntensity: 0.6, transparent: true }), [])

  const chromMats = useMemo(() => CHROMS.map((c) => std(c.color, { emissiveIntensity: 0.35, transparent: true, roughness: 0.4 })), [])
  const chromatinMats = useMemo(() => CHROMS.map((c) => std(c.color, { emissiveIntensity: 0.5, transparent: true })), [])
  const daughterMats = useMemo(() => [0, 1].map(() => ({ env: envMat.clone(), chrom: chromatinMats.map((m) => m.clone()) })), [envMat, chromatinMats])
  const kinetMat = useMemo(() => [std('#ef4444', { emissiveIntensity: 1 }), std('#22c55e', { emissiveIntensity: 1 })], [])

  // interphase chromatin: a random walk inside each territory, plus a replica for S phase
  const chromatin = useMemo(() => {
    const r = prng(77)
    return TERRITORY.map((c, i) => {
      const pts: THREE.Vector3[] = []
      let p = c.clone()
      for (let k = 0; k < 18; k++) {
        pts.push(p.clone())
        p = p.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.55))
        if (p.distanceTo(c) > RN * 0.42) p.lerp(c, 0.5)
        if (p.length() > RN * 0.85) p.multiplyScalar(0.8)
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      const off = new THREE.Vector3(0.05, 0.04, -0.03)
      const curve2 = new THREE.CatmullRomCurve3(pts.map((q) => q.clone().add(off)))
      return {
        curve,
        a: new THREE.TubeGeometry(curve, 140, 0.028 + CHROMS[i].len * 0.01, 5, false),
        b: new THREE.TubeGeometry(curve2, 140, 0.028 + CHROMS[i].len * 0.01, 5, false),
      }
    })
  }, [])
  const armGeo = useMemo(() => CHROMS.map((c) => {
    const L = c.len * R * 0.34
    const g = new THREE.CapsuleGeometry(0.085, L, 6, 12)
    g.translate(0, L / 2 + 0.04, 0) // one end at the centromere (origin)
    return g
  }), [])

  // cytoplasm "protein" particles split in two halves so they follow the daughter cells
  const cyto = useMemo(() => {
    const r = prng(3)
    const make = (sign: number) => {
      const pos: number[] = []
      for (let i = 0; i < 700; i++) {
        let v: THREE.Vector3
        do v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1)
        while (v.length() > 1 || v.length() < 0.5)
        v.multiplyScalar(R * 0.92)
        v.x = Math.abs(v.x) * sign
        pos.push(v.x, v.y, v.z)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      return g
    }
    return [make(-1), make(1)]
  }, [])
  const fragDirs = useMemo(() => {
    const r = prng(19)
    return Array.from({ length: 36 }, () => new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize())
  }, [])
  const astralDirs = useMemo(() => {
    const r = prng(23)
    return Array.from({ length: 12 }, () => new THREE.Vector3(0.6 + r(), r() * 2 - 1, r() * 2 - 1).normalize())
  }, [])
  const interphaseMT = useMemo(() => {
    const r = prng(29)
    return Array.from({ length: 22 }, () => new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize())
  }, [])
  const mtGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 6), 3))
    return g
  }, [])

  // ------------------------------------------------ refs
  const cellRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const cellMeshRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const nucleusRef = useRef<THREE.Group>(null)
  const envRef = useRef<THREE.Mesh>(null)
  const nucleolusRef = useRef<THREE.Mesh>(null)
  const fragRef = useRef<THREE.InstancedMesh>(null)
  const daughterRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const chromatinRefs = useRef<(THREE.Mesh | null)[]>([])
  const replicaRefs = useRef<(THREE.Mesh | null)[]>([])
  const chromRefs = useRef<(THREE.Group | null)[]>([])
  const sisterRefs = useRef<(THREE.Group | null)[]>([])
  const armRefs = useRef<(THREE.Mesh | null)[]>([])
  const kinRefs = useRef<(THREE.Mesh | null)[]>([])
  const forkRefs = useRef<(THREE.Mesh | null)[]>([])
  const centroRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const ringRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const ciliumRef = useRef<THREE.Mesh>(null)
  const labelState = useRef<{ nucleus: boolean; spindle: boolean; ring: boolean; chrom: THREE.Vector3 | null; centro: THREE.Vector3 | null }>({ nucleus: true, spindle: false, ring: false, chrom: null, centro: null })
  const dnaTint = useRef(new THREE.Color())

  useFrame((_, dt) => {
    const c = clock.current
    if (!c) return
    tick(c, dt)
    const s = stateAt(c.t)
    const time = performance.now() / 1000

    // cells (two overlapping spheres that become daughters)
    const rd = R * s.scale * (1 - 0.21 * clamp01(s.sep / (1.2 * R)))
    for (let k = 0; k < 2; k++) {
      const g = cellRefs[k].current!
      g.position.x = (k ? 1 : -1) * s.sep
      g.scale.setScalar(rd / R)
      const m = cellMeshRefs[k].current!
      m.visible = true
    }
    // G0 grey tint via membrane colour
    const tint = s.is('G0') ? '#64748b' : '#38bdf8'
    memMats.forEach((m) => m.uniforms.uColor.value.lerp(dnaTint.current.set(tint), 0.05))

    // cytoplasm particle density grows through G1 (protein synthesis)
    const n = Math.floor(700 * (0.35 + 0.65 * s.growth))
    cyto.forEach((g) => g.setDrawRange(0, n))

    // nucleus (interphase) + envelope breakdown
    const nuc = nucleusRef.current!
    nuc.visible = s.envelope > 0.01
    envRef.current!.scale.setScalar(1 + (1 - s.envelope) * 0.15)
    envMat.opacity = 0.4 * s.envelope
    nucleolusMat.opacity = s.condensed > 0 ? Math.max(0, 1 - s.condensed * 1.5) : 1
    nucleolusRef.current!.visible = nucleolusMat.opacity > 0.02
    // envelope fragments
    const fr = fragRef.current!
    fr.visible = s.fragments > 0 && s.fragments < 1
    if (fr.visible) {
      const m = new THREE.Matrix4()
      fragDirs.forEach((d, i) => {
        const r = RN * (1 + s.fragments * 0.9)
        const sc = 1 - s.fragments
        m.makeScale(sc, sc * 0.35, sc).setPosition(d.x * r, d.y * r, d.z * r)
        fr.setMatrixAt(i, m)
      })
      fr.instanceMatrix.needsUpdate = true
    }

    // daughter nuclei (telophase → cytokinesis)
    for (let k = 0; k < 2; k++) {
      const g = daughterRefs[k].current!
      g.visible = s.daughterNuclei > 0.01
      const x = s.is('cytokinesis') ? (k ? 1 : -1) * (s.sep + 0.05 * R) : (k ? 1 : -1) * (s.poleX - 0.3 * R)
      g.position.set(x, 0, 0)
      g.scale.setScalar(0.55 + 0.45 * s.daughterNuclei)
      g.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
        if (mat && 'opacity' in mat) mat.opacity = (mat.userData.base ?? (mat.userData.base = mat.opacity)) * s.daughterNuclei
      })
    }

    // interphase chromatin + replication
    CHROMS.forEach((_, i) => {
      const a = chromatinRefs.current[i]!
      const b = replicaRefs.current[i]!
      const op = 1 - s.condensed
      a.visible = op > 0.02 && s.envelope > 0.02
      chromatinMats[i].opacity = op * 0.9
      b.visible = a.visible && s.replicated > 0
      const cnt = chromatin[i].b.index!.count
      chromatin[i].b.setDrawRange(0, Math.floor(cnt * s.replicated / 6) * 6)
      const fork = forkRefs.current[i]!
      fork.visible = s.is('S')
      if (fork.visible) fork.position.copy(chromatin[i].curve.getPoint(s.replicated))
    })

    // condensed chromosomes
    CHROMS.forEach((_, i) => {
      const g = chromRefs.current[i]!
      g.visible = s.condensed > 0.01 && !(s.is('cytokinesis'))
      if (!g.visible) return
      const jig = s.is('prometaphase') ? Math.sin(time * 3 + i) * 0.06 * (1 - s.toPlate) : s.is('metaphase') ? Math.sin(time * 2.2 + i * 1.7) * 0.03 : 0
      const pos = TERRITORY[i].clone().lerp(PLATE[i], s.toPlate)
      g.position.set(pos.x + jig, pos.y, pos.z)
      const attachedAt = 0.25 + i * 0.16
      const attached = s.index > phaseIndex('prometaphase') || (s.is('prometaphase') && s.p > attachedAt)
      for (let sis = 0; sis < 2; sis++) {
        const sg = sisterRefs.current[i * 2 + sis]!
        const sign = sis ? 1 : -1
        const xTarget = s.poleX - 0.3 * R
        const x = sign * (0.035 * R + (xTarget - 0.035 * R) * s.separate)
        sg.position.set(x - pos.x * s.separate, -pos.y * s.separate * 0.25, 0)
        const tilt = sign * 0.18 * (1 - s.separate)
        sg.rotation.z = tilt
        // arms trail behind the kinetochore during anaphase (V shape)
        for (let arm = 0; arm < 2; arm++) {
          const m = armRefs.current[(i * 2 + sis) * 2 + arm]!
          const base = arm ? Math.PI : 0
          const fold = s.separate * (Math.PI / 2 - 0.45) * (arm ? -1 : 1) * sign
          m.rotation.z = base + fold
          m.scale.set(0.6 + 0.4 * s.condensed, 0.25 + 0.75 * s.condensed, 0.6 + 0.4 * s.condensed)
        }
        const kin = kinRefs.current[i * 2 + sis]!
        kin.material = kinetMat[attached ? 1 : 0]
        kin.position.set(sign * 0.05, 0, 0)
      }
      chromMats[i].opacity = s.condensed
      const sel = selected?.type === 'chromosome' && selected.index === i
      chromMats[i].emissiveIntensity = sel ? 1 : 0.35
    })

    // centrosomes
    const cA = centroRefs[0].current!, cB = centroRefs[1].current!
    const thA = lerp(Math.PI / 2 - 0.25, Math.PI, s.centrosomeSplit)
    const thB = lerp(Math.PI / 2 + 0.25, 0, s.centrosomeSplit)
    const rc = lerp(RN + 0.35, s.poleX, s.centrosomeSplit)
    if (s.is('cytokinesis') || s.is('telophase')) {
      const x = Math.max(s.poleX, s.sep + 0.35 * R)
      cA.position.set(-x, 0, 0)
      cB.position.set(x, 0, 0)
    } else {
      cA.position.set(Math.cos(thA) * rc, Math.sin(thA) * rc, 0)
      cB.position.set(Math.cos(thB) * rc, Math.sin(thB) * rc, 0)
    }
    cB.visible = s.centrosomeDup > 0.01
    cB.scale.setScalar(0.3 + 0.7 * s.centrosomeDup)
    pcmMat.opacity = 0.18 + 0.25 * s.spindle

    // primary cilium in G0 (templated by the mother centriole)
    const cil = ciliumRef.current!
    cil.visible = s.cilium > 0.02
    cil.scale.set(1, s.cilium, 1)

    // contractile ring
    const ring = ringRef.current!
    const ringR = Math.sqrt(Math.max(0, rd * rd - s.sep * s.sep))
    ring.visible = s.ring > 0.01 && ringR > 0.05
    ring.scale.setScalar(Math.max(0.001, ringR))
    ringMat.opacity = s.ring
    ringMat.emissiveIntensity = selected?.type === 'ring' ? 1.6 : 0.9

    // spindle hit volume
    const hit = hitRef.current!
    hit.visible = s.spindle > 0.3
    hit.scale.set(s.poleX, 0.28 * R, 0.28 * R)

    // microtubules
    const arr = (mtGeo.attributes.position as THREE.BufferAttribute).array as Float32Array
    let w = 0
    const seg = (a: THREE.Vector3, b: THREE.Vector3) => {
      if (w + 6 > arr.length) return
      arr.set([a.x, a.y, a.z, b.x, b.y, b.z], w)
      w += 6
    }
    const pa = cA.position.clone(), pb = cB.position.clone()
    if (s.spindle < 0.05) {
      // interphase radial array from the centrosome
      for (const d of interphaseMT) seg(pa, pa.clone().add(d.clone().multiplyScalar(R * 0.85 * s.scale)))
    } else {
      const k = s.spindle
      for (const [pole, sign] of [[pa, -1], [pb, 1]] as [THREE.Vector3, number][]) {
        for (const d of astralDirs) seg(pole, pole.clone().add(new THREE.Vector3(d.x * sign, d.y, d.z).multiplyScalar(0.55 * R * k)))
        for (let j = 0; j < 7; j++) {
          const yy = (j - 3) * 0.09 * R
          const end = new THREE.Vector3(-sign * (0.18 * R + s.separate * 0.15 * R), yy * 0.6, ((j % 3) - 1) * 0.1 * R)
          seg(pole, pole.clone().lerp(end, k))
        }
      }
      // kinetochore fibres
      CHROMS.forEach((_, i) => {
        const g = chromRefs.current[i]!
        if (!g.visible) return
        const attachedAt = 0.25 + i * 0.16
        const attach = s.index > phaseIndex('prometaphase') ? 1 : s.is('prometaphase') ? smooth((s.p - attachedAt + 0.15) / 0.15) : 0
        if (attach <= 0 || s.is('telophase')) return
        for (let sis = 0; sis < 2; sis++) {
          const kin = kinRefs.current[i * 2 + sis]!
          const kp = new THREE.Vector3()
          kin.getWorldPosition(kp)
          const pole = sis ? pb : pa
          seg(pole, pole.clone().lerp(kp, attach))
        }
      })
    }
    mtGeo.setDrawRange(0, w / 3)
    ;(mtGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    mtMat.opacity = selected?.type === 'spindle' ? 0.95 : 0.5

    // label anchors
    const L = labelState.current
    L.nucleus = s.envelope > 0.5
    L.spindle = s.spindle > 0.5
    L.ring = s.ring > 0.5
    L.chrom = s.condensed > 0.6 && !s.is('cytokinesis') ? chromRefs.current[0]!.position.clone().add(new THREE.Vector3(0, 0.75, 0)) : null
    L.centro = pa.clone().add(new THREE.Vector3(0, 0.4, 0))
  })

  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onPick?.(tagged(e))
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      const t = tagged(e)
      document.body.style.cursor = t ? 'pointer' : 'auto'
    },
    onPointerOut: () => (document.body.style.cursor = 'auto'),
  }

  return (
    <group {...handlers}>
      {[0, 1].map((k) => (
        <group key={k} ref={cellRefs[k]}>
          <mesh ref={cellMeshRefs[k]} material={memMats[k]} raycast={() => null}>
            <sphereGeometry args={[R, 64, 48]} />
          </mesh>
          <mesh material={cytoMat} raycast={() => null}>
            <sphereGeometry args={[R * 0.99, 32, 24]} />
          </mesh>
          <points geometry={cyto[k]} raycast={() => null}>
            <pointsMaterial size={0.035} color="#fde68a" transparent opacity={0.55} depthWrite={false} />
          </points>
        </group>
      ))}

      {/* interphase nucleus */}
      <group ref={nucleusRef}>
        <mesh ref={envRef} material={envMat} userData={{ cc: 'envelope' }}>
          <sphereGeometry args={[RN, 48, 32]} />
        </mesh>
        <mesh ref={nucleolusRef} material={nucleolusMat} position={[0.25, 0.1, 0.3]} raycast={() => null}>
          <icosahedronGeometry args={[0.28, 2]} />
        </mesh>
        {CHROMS.map((_, i) => (
          <group key={i}>
            <mesh ref={(m) => void (chromatinRefs.current[i] = m)} geometry={chromatin[i].a} material={chromatinMats[i]} userData={{ cc: `chromosome:${i}` }} />
            <mesh ref={(m) => void (replicaRefs.current[i] = m)} geometry={chromatin[i].b} material={chromatinMats[i]} userData={{ cc: `chromosome:${i}` }} />
            <mesh ref={(m) => void (forkRefs.current[i] = m)} raycast={() => null}>
              <sphereGeometry args={[0.07, 10, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      <instancedMesh ref={fragRef} args={[undefined, undefined, fragDirs.length]} material={envMat} raycast={() => null}>
        <sphereGeometry args={[0.16, 8, 6]} />
      </instancedMesh>

      {/* daughter nuclei */}
      {[0, 1].map((k) => (
        <group key={k} ref={daughterRefs[k]} visible={false}>
          <mesh material={daughterMats[k].env} userData={{ cc: 'envelope' }}>
            <sphereGeometry args={[RN * 0.72, 32, 24]} />
          </mesh>
          {chromatin.map((c, i) => (
            <mesh key={i} geometry={c.a} scale={0.66} material={daughterMats[k].chrom[i]} raycast={() => null} />
          ))}
          <mesh position={[0.15, 0.05, 0.15]} raycast={() => null}>
            <icosahedronGeometry args={[0.2, 2]} />
            <meshStandardMaterial color="#f0abfc" emissive="#f0abfc" emissiveIntensity={0.3} transparent opacity={0.9} />
          </mesh>
        </group>
      ))}

      {/* condensed chromosomes: 2 sister chromatids each, 2 arms per chromatid hinged at the centromere */}
      {CHROMS.map((_, i) => (
        <group key={i} ref={(g) => void (chromRefs.current[i] = g)} userData={{ cc: `chromosome:${i}` }} visible={false}>
          {[0, 1].map((sis) => (
            <group key={sis} ref={(g) => void (sisterRefs.current[i * 2 + sis] = g)}>
              {[0, 1].map((arm) => (
                <mesh key={arm} ref={(m) => void (armRefs.current[(i * 2 + sis) * 2 + arm] = m)} geometry={armGeo[i]} material={chromMats[i]} />
              ))}
              <mesh ref={(m) => void (kinRefs.current[i * 2 + sis] = m)} material={kinetMat[0]}>
                <sphereGeometry args={[0.07, 10, 10]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* centrosomes */}
      {[0, 1].map((k) => (
        <group key={k} ref={centroRefs[k]} userData={{ cc: 'centrosome' }}>
          <Centriole scale={0.9} />
          <Centriole rotation={[Math.PI / 2, 0, 0]} position={[0.15, 0.05, 0.1]} scale={0.9} />
          <mesh material={pcmMat}>
            <sphereGeometry args={[0.32, 16, 12]} />
          </mesh>
          {k === 0 && (
            <mesh ref={ciliumRef} position={[0, 0, 0]} material={cilMat} raycast={() => null}>
              <cylinderGeometry args={[0.04, 0.05, 1.4, 8]} />
            </mesh>
          )}
        </group>
      ))}

      <lineSegments geometry={mtGeo} material={mtMat} raycast={() => null} />
      <mesh ref={hitRef} material={hitMat} userData={{ cc: 'spindle' }}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <mesh ref={ringRef} material={ringMat} rotation={[0, Math.PI / 2, 0]} userData={{ cc: 'ring' }} visible={false}>
        <torusGeometry args={[1, 0.035, 8, 64]} />
      </mesh>

      {labels && (
        <>
          <DynamicLabel text="Nucleus" get={() => (labelState.current.nucleus ? new THREE.Vector3(0, RN + 0.35, 0) : null)} />
          <DynamicLabel text="Spindle microtubules" get={() => (labelState.current.spindle ? new THREE.Vector3(1.3, -0.95, 0) : null)} />
          <DynamicLabel text="Contractile ring" get={() => (labelState.current.ring ? new THREE.Vector3(0, -R * 0.75, 0) : null)} />
          <DynamicLabel text="Sister chromatids" get={() => labelState.current.chrom} />
          <DynamicLabel text="Centrosome" get={() => labelState.current.centro} />
        </>
      )}
    </group>
  )
}

export { CHROMS as CELL_CYCLE_CHROMOSOMES }
