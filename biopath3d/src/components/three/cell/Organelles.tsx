import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Part } from './Part'
import { fresnelMaterial, prng, randomInShell, std } from './materials'

export const NUCLEUS_POS = new THREE.Vector3(0.3, 0.2, 0.2)
export const NUCLEUS_R = 1.75
export const CELL_R = 5.2
export const GOLGI_POS = new THREE.Vector3(-2.7, 1.1, 1.3)
export const CENTROSOME_POS = new THREE.Vector3(2.2, -1.6, 1.6)

// ------------------------------------------------------------------ membrane
export function Membrane() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(CELL_R, 128, 96)
    const p = g.attributes.position as THREE.BufferAttribute
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const n = v.clone().normalize()
      const d = 0.16 * Math.sin(n.x * 3.1 + n.y * 1.7) * Math.cos(n.z * 2.3) + 0.07 * Math.sin(n.y * 7 + n.x * 5)
      v.copy(n.multiplyScalar(CELL_R + d))
      v.y *= 0.88
      p.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const rim = useMemo(() => fresnelMaterial('#38bdf8', 2.4, 1.3), [])
  const inner = useMemo(() => {
    const m = std('#0e7490', { transparent: true, opacity: 0.07, side: THREE.BackSide, depthWrite: false, emissiveIntensity: 0.25 })
    return m
  }, [])
  return (
    <Part id="membrane" scaleOnExplode={0.55} label={[0, CELL_R * 0.9, 0]}>
      <mesh geometry={geo} material={rim} />
      <mesh geometry={geo} material={inner} scale={0.995} />
    </Part>
  )
}

// ------------------------------------------------------------------ cytoplasm (particles; selectable via list)
export function Cytoplasm() {
  const geo = useMemo(() => {
    const r = prng(11)
    const n = 900
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const v = randomInShell(r, 2.2, CELL_R - 0.4)
      pos.set([v.x, v.y, v.z], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  return (
    <Part id="cytoplasm" showLabel={false}>
      <points geometry={geo} raycast={() => null}>
        <pointsMaterial size={0.05} color="#7dd3fc" transparent opacity={0.45} depthWrite={false} />
      </points>
    </Part>
  )
}

// ------------------------------------------------------------------ nucleus + nucleolus
export function Nucleus() {
  const envelope = useMemo(() => std('#6d28d9', { transparent: true, opacity: 0.55, roughness: 0.3, emissiveIntensity: 0.2, side: THREE.DoubleSide }), [])
  const inner = useMemo(() => std('#4c1d95', { transparent: true, opacity: 0.35, emissiveIntensity: 0.3 }), [])
  const poreMat = useMemo(() => std('#c4b5fd', { emissiveIntensity: 0.6 }), [])
  const chromMat = useMemo(() => std('#e879f9', { emissiveIntensity: 0.45, transparent: true, opacity: 0.8 }), [])
  const nucleolusMat = useMemo(() => std('#f0abfc', { emissiveIntensity: 0.35, roughness: 0.8 }), [])
  const pores = useMemo(() => {
    const r = prng(5)
    const m = new THREE.Matrix4()
    const arr: THREE.Matrix4[] = []
    for (let i = 0; i < 110; i++) {
      const n = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
      m.compose(n.multiplyScalar(NUCLEUS_R), q, new THREE.Vector3(1, 1, 1))
      arr.push(m.clone())
    }
    return arr
  }, [])
  const chromatin = useMemo(() => {
    const r = prng(9)
    const curves: THREE.TubeGeometry[] = []
    for (let c = 0; c < 7; c++) {
      const pts: THREE.Vector3[] = []
      let p = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.4)
      for (let i = 0; i < 14; i++) {
        pts.push(p.clone())
        p = p.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.7))
        if (p.length() > NUCLEUS_R * 0.8) p.multiplyScalar(0.6)
      }
      curves.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.035, 5, false))
    }
    return curves
  }, [])
  return (
    <group position={NUCLEUS_POS}>
      <Part id="nucleus" label={[0, NUCLEUS_R + 0.3, 0]}>
        <mesh material={envelope}>
          <sphereGeometry args={[NUCLEUS_R, 64, 48]} />
        </mesh>
        <mesh material={inner}>
          <sphereGeometry args={[NUCLEUS_R * 0.94, 48, 32]} />
        </mesh>
        <instancedMesh
          args={[undefined, undefined, pores.length]}
          material={poreMat}
          onUpdate={(im) => {
            pores.forEach((m, i) => im.setMatrixAt(i, m))
            im.instanceMatrix.needsUpdate = true
          }}
        >
          <torusGeometry args={[0.07, 0.025, 6, 12]} />
        </instancedMesh>
        {chromatin.map((g, i) => (
          <mesh key={i} geometry={g} material={chromMat} />
        ))}
      </Part>
      <Part id="nucleolus" dir={[0, 3.2, 0]} label={[0.45, 0.95, 0.35]}>
        <mesh position={[0.45, 0.35, 0.35]} material={nucleolusMat}>
          <icosahedronGeometry args={[0.55, 3]} />
        </mesh>
      </Part>
    </group>
  )
}

// ------------------------------------------------------------------ endoplasmic reticulum
export function ER() {
  const sheetMat = useMemo(() => std('#0ea5e9', { transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.6, emissiveIntensity: 0.15 }), [])
  const tubeMat = useMemo(() => std('#38bdf8', { emissiveIntensity: 0.2 }), [])
  const riboMat = useMemo(() => std('#fde68a', { emissiveIntensity: 0.5 }), [])
  const sheets = useMemo(
    () =>
      [2.25, 2.6, 2.95].map((rad, i) => ({
        rad,
        phiStart: 0.4 + i * 0.5,
        phiLen: 2.0 - i * 0.25,
        thetaStart: 0.8 + i * 0.15,
        thetaLen: 1.4,
      })),
    [],
  )
  const bound = useMemo(() => {
    const out: THREE.Matrix4[] = []
    const r = prng(21)
    for (const s of sheets) {
      for (let i = 0; i < 110; i++) {
        const phi = s.phiStart + r() * s.phiLen
        const th = s.thetaStart + r() * s.thetaLen
        const v = new THREE.Vector3().setFromSphericalCoords(s.rad + 0.05, th, phi)
        out.push(new THREE.Matrix4().makeTranslation(v.x, v.y, v.z))
      }
    }
    return out
  }, [sheets])
  const tubes = useMemo(() => {
    const r = prng(33)
    const gs: THREE.TubeGeometry[] = []
    for (let k = 0; k < 6; k++) {
      const pts: THREE.Vector3[] = []
      const start = new THREE.Vector3().setFromSphericalCoords(3.1, 1.2 + r() * 1.5, 3.4 + r() * 2.2)
      let p = start
      for (let i = 0; i < 6; i++) {
        pts.push(p.clone())
        p = p.clone().add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.1))
        if (p.length() > 4.3) p.multiplyScalar(0.85)
        if (p.length() < 2.3) p.multiplyScalar(1.3)
      }
      gs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.07, 6, false))
    }
    return gs
  }, [])
  return (
    <group position={NUCLEUS_POS}>
      <Part id="er" scaleOnExplode={0.35} label={[-1.2, -2.6, 1.3]}>
        {sheets.map((s, i) => (
          <mesh key={i} material={sheetMat}>
            <sphereGeometry args={[s.rad, 48, 24, s.phiStart, s.phiLen, s.thetaStart, s.thetaLen]} />
          </mesh>
        ))}
        {tubes.map((g, i) => (
          <mesh key={i} geometry={g} material={tubeMat} />
        ))}
        <instancedMesh
          args={[undefined, undefined, bound.length]}
          material={riboMat}
          onUpdate={(im) => {
            bound.forEach((m, i) => im.setMatrixAt(i, m))
            im.instanceMatrix.needsUpdate = true
          }}
        >
          <sphereGeometry args={[0.035, 6, 6]} />
        </instancedMesh>
      </Part>
    </group>
  )
}

// ------------------------------------------------------------------ Golgi
export function Golgi() {
  const mats = useMemo(() => ['#f59e0b', '#fbbf24', '#f97316', '#fb923c', '#fdba74'].map((c) => std(c, { side: THREE.DoubleSide, emissiveIntensity: 0.18, roughness: 0.5 })), [])
  const vesMat = useMemo(() => std('#fcd34d', { emissiveIntensity: 0.4 }), [])
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), GOLGI_POS.clone().sub(NUCLEUS_POS).normalize().negate()), [])
  const vesicles = useMemo(() => {
    const r = prng(71)
    return Array.from({ length: 14 }, () => [(r() - 0.5) * 2.4, (r() - 0.3) * 1.2, (r() - 0.5) * 2.4] as [number, number, number])
  }, [])
  return (
    <group position={GOLGI_POS} quaternion={q}>
      <Part id="golgi" dir={[0, -2.4, 0]} label={[0, 1.0, 0]}>
        {mats.map((m, i) => (
          <mesh key={i} material={m} position={[0, i * 0.2 - 0.4, 0]} scale={[1 - i * 0.07, 0.35, 1 - i * 0.07]}>
            <sphereGeometry args={[1.25, 40, 10, 0, Math.PI * 2, 0, 0.62]} />
          </mesh>
        ))}
        {vesicles.map((p, i) => (
          <mesh key={i} position={p} material={vesMat}>
            <sphereGeometry args={[0.08 + (i % 3) * 0.02, 12, 10]} />
          </mesh>
        ))}
      </Part>
    </group>
  )
}

// ------------------------------------------------------------------ mitochondria
function Mitochondrion({ position, rotation }: { position: THREE.Vector3; rotation: THREE.Euler }) {
  const outer = useMemo(() => std('#fb7185', { transparent: true, opacity: 0.55, emissiveIntensity: 0.2, roughness: 0.35 }), [])
  const cristae = useMemo(() => std('#fda4af', { emissiveIntensity: 0.35, side: THREE.DoubleSide }), [])
  const dir = position.clone().normalize().multiplyScalar(2.6)
  return (
    <Part id="mitochondria" dir={[dir.x, dir.y, dir.z]} showLabel={false}>
      <group position={position} rotation={rotation}>
        <mesh material={outer}>
          <capsuleGeometry args={[0.3, 0.95, 8, 20]} />
        </mesh>
        {[-0.38, -0.19, 0, 0.19, 0.38].map((y, i) => (
          <mesh key={i} material={cristae} position={[0, y, 0]} rotation={[Math.PI / 2, 0, (i % 2) * 0.4]}>
            <circleGeometry args={[0.23, 16, 0, Math.PI * 1.35]} />
          </mesh>
        ))}
      </group>
    </Part>
  )
}

export function Mitochondria() {
  const items = useMemo(() => {
    const r = prng(101)
    return Array.from({ length: 9 }, () => ({
      position: randomInShell(r, 2.9, 4.3, { c: GOLGI_POS, r: 1.7 }),
      rotation: new THREE.Euler(r() * Math.PI, r() * Math.PI, r() * Math.PI),
    }))
  }, [])
  const lab = items[0].position
  return (
    <>
      {items.map((m, i) => (
        <Mitochondrion key={i} {...m} />
      ))}
      <Part id="mitochondria" dir={[lab.x * 0.6, lab.y * 0.6, lab.z * 0.6]} label={[lab.x, lab.y + 0.7, lab.z]}>
        <group />
      </Part>
    </>
  )
}

// ------------------------------------------------------------------ free ribosomes
export function Ribosomes() {
  const mat = useMemo(() => std('#fde68a', { emissiveIntensity: 0.45 }), [])
  const matrices = useMemo(() => {
    const r = prng(202)
    return Array.from({ length: 420 }, () => {
      const v = randomInShell(r, 2.3, CELL_R - 0.5)
      return new THREE.Matrix4().makeTranslation(v.x, v.y, v.z)
    })
  }, [])
  return (
    <Part id="ribosomes" scaleOnExplode={0.25} label={[3.3, 2.4, 1.4]}>
      <instancedMesh
        args={[undefined, undefined, matrices.length]}
        material={mat}
        onUpdate={(im) => {
          matrices.forEach((m, i) => im.setMatrixAt(i, m))
          im.instanceMatrix.needsUpdate = true
        }}
      >
        <icosahedronGeometry args={[0.045, 1]} />
      </instancedMesh>
    </Part>
  )
}

// ------------------------------------------------------------------ lysosomes & peroxisomes
export function Lysosomes() {
  const shell = useMemo(() => std('#8b5cf6', { transparent: true, opacity: 0.7, emissiveIntensity: 0.3 }), [])
  const core = useMemo(() => std('#ddd6fe', { emissiveIntensity: 0.6 }), [])
  const items = useMemo(() => {
    const r = prng(303)
    return Array.from({ length: 7 }, () => randomInShell(r, 2.6, 4.4, { c: GOLGI_POS, r: 1.3 }))
  }, [])
  return (
    <>
      {items.map((p, i) => {
        const d = p.clone().normalize().multiplyScalar(2.4)
        return (
          <Part key={i} id="lysosomes" dir={[d.x, d.y, d.z]} label={i === 0 ? [p.x, p.y + 0.5, p.z] : undefined}>
            <group position={p}>
              <mesh material={shell}>
                <sphereGeometry args={[0.28, 20, 16]} />
              </mesh>
              {[0, 1, 2, 3].map((k) => (
                <mesh key={k} material={core} position={[Math.sin(k * 1.7) * 0.1, Math.cos(k * 2.3) * 0.1, Math.sin(k) * 0.08]}>
                  <sphereGeometry args={[0.045, 6, 6]} />
                </mesh>
              ))}
            </group>
          </Part>
        )
      })}
    </>
  )
}

export function Peroxisomes() {
  const shell = useMemo(() => std('#10b981', { transparent: true, opacity: 0.6, emissiveIntensity: 0.25 }), [])
  const core = useMemo(() => std('#6ee7b7', { emissiveIntensity: 0.7, flatShading: true }), [])
  const items = useMemo(() => {
    const r = prng(404)
    return Array.from({ length: 6 }, () => randomInShell(r, 2.5, 4.3, { c: GOLGI_POS, r: 1.3 }))
  }, [])
  return (
    <>
      {items.map((p, i) => {
        const d = p.clone().normalize().multiplyScalar(2.2)
        return (
          <Part key={i} id="peroxisomes" dir={[d.x, d.y, d.z]} label={i === 0 ? [p.x, p.y + 0.45, p.z] : undefined}>
            <group position={p}>
              <mesh material={shell}>
                <sphereGeometry args={[0.22, 20, 16]} />
              </mesh>
              <mesh material={core}>
                <octahedronGeometry args={[0.1, 0]} />
              </mesh>
            </group>
          </Part>
        )
      })}
    </>
  )
}

// ------------------------------------------------------------------ centrosome (two orthogonal centrioles of 9 triplets) + microtubules
export function Centriole({ rotation = [0, 0, 0] as [number, number, number], position = [0, 0, 0] as [number, number, number], scale = 1 }) {
  const mat = useMemo(() => std('#67e8f9', { emissiveIntensity: 0.55 }), [])
  const matrices = useMemo(() => {
    const out: THREE.Matrix4[] = []
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      for (let t = 0; t < 3; t++) {
        const rr = 0.13 + t * 0.028
        const aa = a + t * 0.16
        out.push(new THREE.Matrix4().makeTranslation(Math.cos(aa) * rr, 0, Math.sin(aa) * rr))
      }
    }
    return out
  }, [])
  return (
    <group rotation={rotation} position={position} scale={scale}>
      <instancedMesh
        args={[undefined, undefined, matrices.length]}
        material={mat}
        onUpdate={(im) => {
          matrices.forEach((m, i) => im.setMatrixAt(i, m))
          im.instanceMatrix.needsUpdate = true
        }}
      >
        <cylinderGeometry args={[0.014, 0.014, 0.5, 6]} />
      </instancedMesh>
    </group>
  )
}

export function Centrosome() {
  const pcm = useMemo(() => std('#22d3ee', { transparent: true, opacity: 0.16, emissiveIntensity: 0.5, depthWrite: false }), [])
  const mtMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.35 }), [])
  const microtubules = useMemo(() => {
    const r = prng(505)
    const pts: number[] = []
    for (let i = 0; i < 34; i++) {
      const d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize()
      const end = CENTROSOME_POS.clone().add(d.multiplyScalar(2 + r() * 3))
      if (end.length() > CELL_R - 0.3) end.setLength(CELL_R - 0.3)
      pts.push(0, 0, 0, end.x - CENTROSOME_POS.x, end.y - CENTROSOME_POS.y, end.z - CENTROSOME_POS.z)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  const d = CENTROSOME_POS.clone().normalize().multiplyScalar(2.2)
  return (
    <group position={CENTROSOME_POS}>
      <Part id="centrosome" dir={[d.x, d.y, d.z]} label={[0, 0.55, 0]}>
        <Centriole />
        <Centriole rotation={[Math.PI / 2, 0, 0]} position={[0.2, 0.05, 0.2]} />
        <mesh material={pcm}>
          <sphereGeometry args={[0.45, 20, 16]} />
        </mesh>
        <lineSegments geometry={microtubules} material={mtMat} raycast={() => null} />
      </Part>
    </group>
  )
}

// ------------------------------------------------------------------ secretory traffic: ER → Golgi → plasma membrane
export function VesicleTraffic({ speed = 1 }: { speed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const N = 10
  const curves = useMemo(() => {
    const golgiOut = GOLGI_POS.clone().add(GOLGI_POS.clone().sub(NUCLEUS_POS).normalize().multiplyScalar(0.9))
    const er = NUCLEUS_POS.clone().add(GOLGI_POS.clone().sub(NUCLEUS_POS).normalize().multiplyScalar(2.4))
    const pm = golgiOut.clone().normalize().multiplyScalar(CELL_R - 0.25)
    return [
      new THREE.CatmullRomCurve3([er, er.clone().lerp(GOLGI_POS, 0.5).add(new THREE.Vector3(0, 0.3, 0)), GOLGI_POS]),
      new THREE.CatmullRomCurve3([golgiOut, golgiOut.clone().lerp(pm, 0.5).add(new THREE.Vector3(0.2, 0.4, 0)), pm]),
    ]
  }, [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    const im = ref.current
    if (!im) return
    const t = clock.elapsedTime * 0.12 * speed
    for (let i = 0; i < N; i++) {
      const c = curves[i % 2]
      const u = (t + i / N) % 1
      const p = c.getPointAt(u)
      const s = Math.sin(u * Math.PI) * 0.09 + 0.02
      m.makeScale(s / 0.1, s / 0.1, s / 0.1).setPosition(p)
      im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} raycast={() => null}>
      <sphereGeometry args={[0.1, 12, 10]} />
      <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.9} />
    </instancedMesh>
  )
}
