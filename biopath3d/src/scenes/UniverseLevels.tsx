import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CellModel } from '../components/three/cell/CellModel'
import { SmallMoleculeModel } from '../components/three/MoleculeModel'
import { PathwayScene } from './PathwayScene'
import { PATHWAY_MAP, MOLECULE_MAP } from '../data'
import { useSimClock } from '../engine/clock'
import { prng } from '../components/three/cell/materials'
import { Label3D } from '../components/three/Label3D'

const glass = (color: string, opacity = 0.35) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} transparent opacity={opacity} roughness={0.3} depthWrite={false} />
)

function Pulse({ position, color = '#22d3ee', r = 0.3 }: { position: [number, number, number]; color?: string; r?: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const s = 1 + 0.35 * Math.sin(clock.elapsedTime * 3)
    ref.current?.scale.setScalar(s)
  })
  return (
    <mesh ref={ref} position={position} raycast={() => null}>
      <sphereGeometry args={[r, 16, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  )
}

export function OrganismLevel() {
  return (
    <group position={[0, -0.5, 0]}>
      <mesh position={[0, 3.3, 0]}><sphereGeometry args={[0.55, 32, 24]} />{glass('#38bdf8')}</mesh>
      <mesh position={[0, 1.6, 0]}><capsuleGeometry args={[0.85, 1.6, 8, 24]} />{glass('#38bdf8', 0.25)}</mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.25, 1.7, 0]} rotation={[0, 0, s * 0.18]}><capsuleGeometry args={[0.22, 1.9, 6, 12]} />{glass('#38bdf8', 0.25)}</mesh>
          <mesh position={[s * 0.45, -1.3, 0]}><capsuleGeometry args={[0.3, 2.2, 6, 12]} />{glass('#38bdf8', 0.25)}</mesh>
        </group>
      ))}
      <mesh position={[0.1, 2.1, 0.2]}><sphereGeometry args={[0.22, 16, 12]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} /></mesh>
      <mesh position={[-0.35, 1.35, 0.25]} scale={[1.3, 0.6, 0.7]}><sphereGeometry args={[0.4, 24, 16]} /><meshStandardMaterial color="#b45309" emissive="#b45309" emissiveIntensity={0.6} /></mesh>
      <Pulse position={[-0.35, 1.35, 0.25]} r={0.6} />
      <Label3D position={[-0.35, 1.35, 0.9]} text="Liver" hot />
    </group>
  )
}

export function OrganLevel() {
  const gut = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 60; i++) {
      const t = i / 60
      pts.push(new THREE.Vector3(Math.sin(t * 18) * (1.4 - t * 0.3), -1.2 - t * 2.4 + Math.cos(t * 18) * 0.25, Math.cos(t * 9) * 0.4))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.18, 10, false)
  }, [])
  return (
    <group>
      <mesh position={[-1.1, 0.8, 0]} scale={[1.7, 0.9, 1]} rotation={[0, 0, -0.2]}>
        <sphereGeometry args={[1.2, 40, 28]} />
        <meshStandardMaterial color="#9a3412" emissive="#9a3412" emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[1.4, 0.6, 0.2]} rotation={[0, 0, 0.9]}><capsuleGeometry args={[0.5, 1.2, 8, 20]} />{glass('#f472b6', 0.6)}</mesh>
      <mesh position={[-0.6, -0.1, 0.8]}><sphereGeometry args={[0.28, 16, 12]} /><meshStandardMaterial color="#65a30d" emissive="#65a30d" emissiveIntensity={0.3} /></mesh>
      <mesh geometry={gut}><meshStandardMaterial color="#fda4af" emissive="#fb7185" emissiveIntensity={0.2} /></mesh>
      <mesh position={[0.3, 2.6, 0]}><cylinderGeometry args={[0.18, 0.18, 1.6, 12]} />{glass('#f9a8d4', 0.6)}</mesh>
      <Pulse position={[-1.4, 1.0, 1.1]} r={0.35} />
      <Label3D position={[-1.4, 2.0, 0.5]} text="Liver" hot />
      <Label3D position={[1.4, 1.5, 0.2]} text="Stomach" />
      <Label3D position={[-0.6, 0.25, 0.8]} text="Gallbladder" />
      <Label3D position={[0.9, -2.2, 0.4]} text="Intestine" />
    </group>
  )
}

export function TissueLevel() {
  // Hepatic lobule: plates of hepatocytes radiating from a central vein, portal triads at the corners.
  const cells = useMemo(() => {
    const out: { p: THREE.Vector3; r: number }[] = []
    const rnd = prng(12)
    for (let spoke = 0; spoke < 18; spoke++) {
      const a = (spoke / 18) * Math.PI * 2
      for (let k = 1; k < 9; k++) {
        const r = 0.55 + k * 0.42
        out.push({ p: new THREE.Vector3(Math.cos(a + (rnd() - 0.5) * 0.05) * r, Math.sin(a) * r, (rnd() - 0.5) * 0.3), r: a })
      }
    }
    return out
  }, [])
  const ref = useRef<THREE.InstancedMesh>(null)
  const m = useMemo(() => {
    const m4 = new THREE.Matrix4()
    return cells.map((c) => m4.compose(c.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, c.r)), new THREE.Vector3(0.36, 0.3, 0.34)).clone())
  }, [cells])
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} onUpdate={(im) => { m.forEach((x, i) => im.setMatrixAt(i, x)); im.instanceMatrix.needsUpdate = true }}>
        <boxGeometry args={[1, 1, 1, 2, 2, 2]} />
        <meshStandardMaterial color="#c2410c" emissive="#fb923c" emissiveIntensity={0.25} roughness={0.6} />
      </instancedMesh>
      <mesh><cylinderGeometry args={[0.35, 0.35, 1, 24]} /><meshStandardMaterial color="#1d4ed8" emissive="#3b82f6" emissiveIntensity={0.4} /></mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        return (
          <group key={i} position={[Math.cos(a) * 4.2, Math.sin(a) * 4.2, 0]}>
            <mesh position={[0.15, 0, 0]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.4} /></mesh>
            <mesh position={[-0.15, 0.1, 0]}><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.4} /></mesh>
            <mesh position={[0, -0.18, 0]}><sphereGeometry args={[0.09, 12, 10]} /><meshStandardMaterial color="#65a30d" emissive="#65a30d" emissiveIntensity={0.4} /></mesh>
          </group>
        )
      })}
      <Pulse position={[cells[20].p.x, cells[20].p.y, 0.3]} r={0.3} />
      <Label3D position={[0, 0.6, 0.6]} text="Central vein" />
      <Label3D position={[Math.cos(Math.PI / 6) * 4.2, Math.sin(Math.PI / 6) * 4.2 + 0.5, 0.3]} text="Portal triad" />
      <Label3D position={[cells[20].p.x, cells[20].p.y + 0.6, 0.4]} text="Hepatocyte" hot />
    </group>
  )
}

export function CellLevel() {
  return (
    <group scale={0.62}>
      <CellModel labels={false} interactive={false} highlight="nucleus" />
      <Label3D position={[0.3, 2.4, 0.2]} text="Nucleus" hot />
    </group>
  )
}

export function OrganelleLevel() {
  const chromatin = useMemo(() => {
    const r = prng(44)
    return Array.from({ length: 9 }, () => {
      const pts: THREE.Vector3[] = []
      let p = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(2)
      for (let i = 0; i < 16; i++) {
        pts.push(p.clone())
        p = p.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9))
        if (p.length() > 2.4) p.multiplyScalar(0.7)
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.06, 6, false)
    })
  }, [])
  return (
    <group>
      <mesh><sphereGeometry args={[3, 64, 48, 0, Math.PI * 1.45]} /><meshStandardMaterial color="#6d28d9" emissive="#7c3aed" emissiveIntensity={0.25} side={THREE.DoubleSide} transparent opacity={0.55} /></mesh>
      <mesh><sphereGeometry args={[2.85, 64, 48, 0, Math.PI * 1.45]} /><meshStandardMaterial color="#4c1d95" emissive="#4c1d95" emissiveIntensity={0.25} side={THREE.DoubleSide} transparent opacity={0.4} /></mesh>
      <mesh position={[0.8, 0.6, 0.3]}><icosahedronGeometry args={[0.8, 3]} /><meshStandardMaterial color="#f0abfc" emissive="#f0abfc" emissiveIntensity={0.3} /></mesh>
      {chromatin.map((g, i) => (
        <mesh key={i} geometry={g}><meshStandardMaterial color="#e879f9" emissive="#e879f9" emissiveIntensity={0.4} /></mesh>
      ))}
      <Pulse position={[-0.8, -0.6, 0.8]} r={0.4} color="#e879f9" />
      <Label3D position={[0.8, 1.6, 0.3]} text="Nucleolus" />
      <Label3D position={[-0.8, 0, 1]} text="Chromatin" hot />
      <Label3D position={[0, 3.3, 0]} text="Nuclear envelope (double membrane)" />
    </group>
  )
}

export function DNALevel() {
  // Nucleosomes: ~147 bp wrapped ~1.65 turns around a histone octamer, joined by linker DNA ("beads on a string")
  const { wrap, beads } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const beads: THREE.Vector3[] = []
    for (let n = 0; n < 5; n++) {
      const c = new THREE.Vector3(-6 + n * 3, Math.sin(n) * 0.6, 0)
      beads.push(c)
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * Math.PI * 2 * 1.65
        pts.push(new THREE.Vector3(c.x + Math.cos(a) * 0.95, c.y + Math.sin(a) * 0.95, (i / 60 - 0.5) * 0.9))
      }
    }
    return { wrap: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, 0.11, 6, false), beads }
  }, [])
  return (
    <group>
      <mesh geometry={wrap}><meshStandardMaterial color="#e879f9" emissive="#e879f9" emissiveIntensity={0.4} /></mesh>
      {beads.map((b, i) => (
        <mesh key={i} position={b} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.75, 0.75, 0.75, 24]} /><meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.3} /></mesh>
      ))}
      <Pulse position={[beads[2].x, beads[2].y, 0.6]} r={0.4} color="#e879f9" />
      <Label3D position={[beads[1].x, beads[1].y + 1.4, 0]} text="Nucleosome (histone octamer)" />
      <Label3D position={[beads[2].x, beads[2].y - 1.3, 0]} text="~147 bp DNA wrapped 1.65 turns" hot />
    </group>
  )
}

export function GeneLevel() {
  const regions = [
    { name: 'Promoter (TATA)', len: 2, color: '#64748b' },
    { name: "5′ UTR", len: 1, color: '#94a3b8' },
    { name: 'Exon 1', len: 2.2, color: '#22d3ee' },
    { name: 'Intron', len: 3, color: '#475569' },
    { name: 'Exon 2', len: 2.6, color: '#22d3ee' },
    { name: "3′ UTR + poly(A) signal", len: 1.6, color: '#94a3b8' },
  ]
  const total = regions.reduce((s, r) => s + r.len, 0)
  let x = -total / 2
  return (
    <group>
      {regions.map((r) => {
        const cx = x + r.len / 2
        x += r.len
        return (
          <group key={r.name} position={[cx, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.35, r.len - 0.05, 24]} /><meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={0.3} /></mesh>
            <Label3D position={[0, 0.8, 0]} text={r.name} hot={r.name === 'Exon 1'} />
          </group>
        )
      })}
      <mesh position={[-total / 2 + 2.3, -0.2, 0]}><sphereGeometry args={[0.7, 24, 18]} /><meshStandardMaterial color="#a78bfa" transparent opacity={0.45} emissive="#7c3aed" emissiveIntensity={0.4} /></mesh>
      <Label3D position={[-total / 2 + 2.3, -1.2, 0]} text="RNA polymerase II at the promoter" />
      <Pulse position={[-total / 2 + 4.1, 0, 0.3]} r={0.45} />
    </group>
  )
}

export function ProteinLevel() {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let h = 0; h < 4; h++) {
      const cx = (h % 2) * 2.2 - 1.1, cz = Math.floor(h / 2) * 2.2 - 1.1
      const dir = h % 2 ? -1 : 1
      for (let i = 0; i < 40; i++) {
        const a = i * 1.745
        pts.push(new THREE.Vector3(cx + Math.cos(a) * 0.45, dir * (i / 40 - 0.5) * 5, cz + Math.sin(a) * 0.45))
      }
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, 0.2, 8, false)
  }, [])
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.25} /></mesh>
      <Pulse position={[0, 0.5, 0]} r={0.5} color="#facc15" />
      <Label3D position={[0, 3.2, 0]} text="Four-helix bundle (schematic fold)" />
      <Label3D position={[0, 1.2, 0.8]} text="Active site" hot />
    </group>
  )
}

export function InteractionLevel() {
  const pRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.35) % 1
    pRef.current?.position.set(-0.4 + t * 2.2, 0.6 + Math.sin(t * Math.PI) * 0.8, 0.2)
  })
  const atp = MOLECULE_MAP['atp']
  return (
    <group>
      <mesh position={[-2.2, 0, 0]} scale={[1.4, 1.1, 1.1]}><sphereGeometry args={[1.6, 40, 28, 0, Math.PI * 1.7]} /><meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh position={[2.4, 0, 0]}><dodecahedronGeometry args={[1.2, 1]} /><meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.3} flatShading /></mesh>
      {atp && <group position={[-1.1, 0.2, 0.2]}><SmallMoleculeModel mol={atp} scale={0.17} showH={false} /></group>}
      <mesh ref={pRef}><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.9} /></mesh>
      <Label3D position={[-2.4, 2.2, 0]} text="Kinase (schematic)" />
      <Label3D position={[-1.1, -1, 0.8]} text="ATP (computed 3D)" />
      <Label3D position={[2.4, 1.7, 0]} text="Substrate protein" />
      <Label3D position={[0.6, 1.8, 0.2]} text="γ-phosphate transfer → Ser/Thr/Tyr" hot />
    </group>
  )
}

export function SignalingLevel() {
  const clock = useSimClock({ end: 1e9 })
  return (
    <group scale={0.32}>
      <PathwayScene pathway={PATHWAY_MAP['egfr-mapk']} clock={clock} labels={false} />
    </group>
  )
}

export function MetabolicLevel() {
  const clock = useSimClock({ end: 1e9 })
  return (
    <group scale={0.42}>
      <PathwayScene pathway={PATHWAY_MAP['tca']} clock={clock} labels={false} />
    </group>
  )
}
