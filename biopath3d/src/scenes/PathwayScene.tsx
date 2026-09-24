import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { DomLabel, escapeHtml } from '../components/three/Label3D'
import * as THREE from 'three'
import type { Pathway, PathwayEdge, PathwayNode } from '../data/schema'
import { layoutPathway, bounds, type Vec3 } from '../engine/layout'
import { NODE_COLOR, EDGE_COLOR, COMPARTMENT_STYLE } from './pathwayStyle'
import type { SimClock } from '../engine/clock'
import { tick } from '../engine/clock'

export interface PathwaySceneProps {
  pathway: Pathway
  clock: React.RefObject<SimClock>
  /** Nodes/edges to emphasise (e.g. current walkthrough step). Empty = whole pathway flows. */
  focusNodes?: string[]
  focusEdges?: [string, string][]
  selected?: string | null
  onSelectNode?: (n: PathwayNode) => void
  onSelectEdge?: (e: PathwayEdge) => void
  labels?: boolean
  /** Custom 3D body for a node (e.g. a real molecule for metabolites). */
  renderNode?: (n: PathwayNode) => React.ReactNode | null
  /** Custom overlay at an edge's midpoint (e.g. enzyme name, ATP token). */
  edgeTag?: (e: PathwayEdge, active: boolean) => string | null
}

function NodeShape({ type }: { type: PathwayNode['type'] }) {
  switch (type) {
    case 'receptor':
      return <capsuleGeometry args={[0.28, 1.1, 6, 16]} />
    case 'ligand':
      return <icosahedronGeometry args={[0.28, 1]} />
    case 'adaptor':
      return <torusKnotGeometry args={[0.24, 0.08, 48, 8]} />
    case 'gtpase':
      return <dodecahedronGeometry args={[0.38, 0]} />
    case 'kinase':
      return <icosahedronGeometry args={[0.42, 0]} />
    case 'phosphatase':
    case 'transcription-factor':
      return <octahedronGeometry args={[0.42, 0]} />
    case 'inhibitor':
      return <boxGeometry args={[0.55, 0.55, 0.55]} />
    case 'second-messenger':
    case 'drug':
      return <tetrahedronGeometry args={[0.36, 0]} />
    case 'outcome':
    case 'process':
      return <torusGeometry args={[0.38, 0.13, 12, 32]} />
    case 'gene':
      return <cylinderGeometry args={[0.18, 0.18, 0.9, 12]} />
    case 'stimulus':
      return <icosahedronGeometry args={[0.4, 0]} />
    case 'complex':
      return <sphereGeometry args={[0.44, 20, 14]} />
    default:
      return <sphereGeometry args={[0.38, 24, 16]} />
  }
}

function edgeCurve(a: Vec3, b: Vec3, k: number) {
  const A = new THREE.Vector3(...a)
  const B = new THREE.Vector3(...b)
  const mid = A.clone().lerp(B, 0.5)
  const d = B.clone().sub(A)
  const side = new THREE.Vector3(-d.y, d.x, 0).normalize().multiplyScalar(0.35 * k)
  mid.add(side).add(new THREE.Vector3(0, 0, 0.6 * k))
  // shorten ends so arrows sit outside node bodies
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B)
  const len = curve.getLength()
  const t0 = Math.min(0.45, 0.55 / len)
  const t1 = 1 - Math.min(0.45, 0.62 / len)
  return new THREE.QuadraticBezierCurve3(curve.getPoint(t0), mid, curve.getPoint(t1))
}

/** Generic, data-driven 3D pathway network with signal particles. */
export function PathwayScene({ pathway, clock, focusNodes = [], focusEdges = [], selected, onSelectNode, onSelectEdge, labels = true, renderNode, edgeTag }: PathwaySceneProps) {
  const pos = useMemo(() => layoutPathway(pathway), [pathway])
  const bb = useMemo(() => bounds(pos), [pos])
  const focusN = useMemo(() => new Set(focusNodes), [focusNodes])
  const focusE = useMemo(() => new Set(focusEdges.map(([a, b]) => `${a}>${b}`)), [focusEdges])
  const hasFocus = focusN.size > 0 || focusE.size > 0

  const edges = useMemo(() => {
    const seen = new Map<string, number>()
    return pathway.edges.map((e) => {
      const key = [e.from, e.to].sort().join('|')
      const k = seen.get(key) ?? 0
      seen.set(key, k + 1)
      const curve = edgeCurve(pos[e.from], pos[e.to], k % 2 ? -1 : 1)
      const tube = new THREE.TubeGeometry(curve, 32, e.type === 'crosstalk' ? 0.025 : 0.04, 6, false)
      const end = curve.getPoint(1)
      const tan = curve.getTangent(1)
      return { e, curve, tube, end, tan, mid: curve.getPoint(0.5), id: `${e.from}>${e.to}` }
    })
  }, [pathway, pos])

  const compartments = useMemo(() => {
    if (pathway.layout === 'force' || pathway.layout === 'manual') return []
    const groups = new Map<string, number[]>()
    for (const n of pathway.nodes) {
      if (!n.compartment) continue
      groups.set(n.compartment, [...(groups.get(n.compartment) ?? []), pos[n.id][1]])
    }
    return [...groups.entries()].map(([c, ys]) => ({ c: c as keyof typeof COMPARTMENT_STYLE, min: Math.min(...ys) - 0.8, max: Math.max(...ys) + 0.8 }))
  }, [pathway, pos])

  // particles: 3 per edge
  const P = 3
  const particleRef = useRef<THREE.InstancedMesh>(null)
  const pColors = useMemo(() => {
    const arr = new Float32Array(edges.length * P * 3)
    edges.forEach((ed, i) => {
      const c = new THREE.Color(EDGE_COLOR[ed.e.type])
      for (let k = 0; k < P; k++) arr.set([c.r, c.g, c.b], (i * P + k) * 3)
    })
    return arr
  }, [edges])
  const nodeRefs = useRef<Record<string, THREE.Mesh | null>>({})
  const phosRefs = useRef<Record<string, THREE.Mesh | null>>({})
  const m4 = useMemo(() => new THREE.Matrix4(), [])

  useFrame((state, dt) => {
    const c = clock.current
    if (c) tick(c, dt)
    const t = c?.t ?? state.clock.elapsedTime
    const im = particleRef.current
    if (im) {
      edges.forEach((ed, i) => {
        const active = hasFocus ? focusE.has(ed.id) : true
        for (let k = 0; k < P; k++) {
          const u = (t * 0.35 + k / P + i * 0.13) % 1
          const p = ed.curve.getPoint(u)
          const s = active ? (ed.e.type === 'inhibition' ? 0.09 : 0.075) * Math.sin(u * Math.PI) + 0.02 : 0
          m4.makeScale(s / 0.1, s / 0.1, s / 0.1).setPosition(p)
          im.setMatrixAt(i * P + k, m4)
        }
      })
      im.instanceMatrix.needsUpdate = true
    }
    // node pulse & phosphorylation tags
    const time = state.clock.elapsedTime
    for (const n of pathway.nodes) {
      const mesh = nodeRefs.current[n.id]
      if (!mesh) continue
      const focus = hasFocus ? focusN.has(n.id) : false
      const sel = selected && (selected === n.id || selected === n.ref)
      const mat = mesh.material as THREE.MeshStandardMaterial
      const target = sel ? 1.3 : focus ? 0.9 + 0.3 * Math.sin(time * 4) : hasFocus ? 0.08 : 0.3
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.15
      mat.opacity += ((hasFocus && !focus && !sel ? 0.35 : 1) - mat.opacity) * 0.15
      mesh.rotation.y += dt * (focus ? 0.9 : 0.25)
      const sc = sel ? 1.25 : focus ? 1.12 : 1
      mesh.scale.lerp(new THREE.Vector3(sc, sc, sc), 0.12)
      const tag = phosRefs.current[n.id]
      if (tag) {
        const phos = edges.some((ed) => ed.e.to === n.id && ed.e.type === 'phosphorylation' && (hasFocus ? focusE.has(ed.id) : true))
        tag.visible = phos
        const a = time * 2 + n.id.length
        tag.position.set(Math.cos(a) * 0.62, Math.sin(a * 1.3) * 0.25 + 0.3, Math.sin(a) * 0.62)
      }
    }
  })

  const click = (fn: () => void) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    fn()
  }
  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }
  const unhover = () => (document.body.style.cursor = 'auto')

  const width = bb.max[0] - bb.min[0] + 5

  return (
    <group position={[-bb.center[0], -bb.center[1], 0]}>
      {/* compartments */}
      {compartments.map(({ c, min, max }) => (
        <group key={c} position={[bb.center[0], (min + max) / 2, -1.6]}>
          {c === 'membrane' ? (
            <Membrane width={width} />
          ) : (
            <mesh raycast={() => null}>
              <planeGeometry args={[width, max - min]} />
              <meshBasicMaterial color={COMPARTMENT_STYLE[c].color} transparent opacity={c === 'outcome' ? 0.05 : 0.07} depthWrite={false} />
            </mesh>
          )}
          {labels && (
            <DomLabel
              position={[-width / 2 + 0.3, (max - min) / 2 - 0.25, 0]}
              anchor="left"
              className="text-[10px] font-semibold tracking-widest whitespace-nowrap uppercase"
              html={`<span style="color:${COMPARTMENT_STYLE[c].color};opacity:.8">${escapeHtml(COMPARTMENT_STYLE[c].label)}</span>`}
            />
          )}
        </group>
      ))}

      {/* edges */}
      {edges.map((ed) => {
        const active = hasFocus ? focusE.has(ed.id) : true
        const col = EDGE_COLOR[ed.e.type]
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ed.tan.clone().normalize())
        return (
          <group key={ed.id} onClick={click(() => onSelectEdge?.(ed.e))} onPointerOver={hover} onPointerOut={unhover}>
            <mesh geometry={ed.tube}>
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={active ? 0.7 : 0.1} transparent opacity={active ? 0.85 : 0.18} />
            </mesh>
            {edgeTag && labels && (() => {
              const tag = edgeTag(ed.e, active)
              return tag ? <DomLabel position={ed.mid} anchor="center" className="" html={tag} /> : null
            })()}
            <mesh position={ed.end} quaternion={q}>
              {ed.e.type === 'inhibition' ? <boxGeometry args={[0.42, 0.06, 0.2]} /> : <coneGeometry args={[0.11, 0.26, 12]} />}
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={active ? 0.8 : 0.1} transparent opacity={active ? 1 : 0.25} />
            </mesh>
          </group>
        )
      })}

      <instancedMesh
        ref={particleRef}
        args={[undefined, undefined, edges.length * P]}
        raycast={() => null}
        onUpdate={(im) => {
          im.instanceColor = new THREE.InstancedBufferAttribute(pColors, 3)
        }}
      >
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* nodes */}
      {pathway.nodes.map((n) => {
        const col = NODE_COLOR[n.type]
        const p = pos[n.id]
        const dim = hasFocus && !focusN.has(n.id) && selected !== n.id
        const custom = renderNode?.(n)
        return (
          <group key={n.id} position={p}>
            {custom && (
              <group onClick={click(() => onSelectNode?.(n))} onPointerOver={hover} onPointerOut={unhover}>
                {custom}
              </group>
            )}
            <mesh
              visible={!custom}
              ref={(m) => void (nodeRefs.current[n.id] = m)}
              onClick={click(() => onSelectNode?.(n))}
              onPointerOver={hover}
              onPointerOut={unhover}
              rotation={[n.type === 'receptor' ? 0 : 0.4, 0, n.type === 'outcome' || n.type === 'process' ? 0 : 0]}
            >
              <NodeShape type={n.type} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.3} roughness={0.35} metalness={0.15} transparent flatShading={n.type === 'kinase' || n.type === 'gtpase' || n.type === 'stimulus'} />
            </mesh>
            <mesh ref={(m) => void (phosRefs.current[n.id] = m)} visible={false} raycast={() => null}>
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshBasicMaterial color="#fde047" toneMapped={false} />
            </mesh>
            {labels && (
              <DomLabel
                position={[0, n.type === 'receptor' ? 1.05 : 0.72, 0]}
                anchor="center"
                className={`label-3d ${selected === n.id || selected === n.ref ? 'hot' : ''} ${dim ? 'dim' : ''}`}
                html={escapeHtml(n.label) + (n.link ? '<span class="ml-1 text-cyan-300">↗</span>' : '')}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

/** Stylised phospholipid bilayer band. */
function Membrane({ width }: { width: number }) {
  const heads = useMemo(() => {
    const out: THREE.Matrix4[] = []
    const n = Math.floor(width / 0.28)
    for (let layer = 0; layer < 2; layer++)
      for (let i = 0; i < n; i++) out.push(new THREE.Matrix4().makeTranslation(-width / 2 + i * 0.28 + 0.14, layer ? -0.28 : 0.28, 0))
    return out
  }, [width])
  return (
    <group>
      <mesh raycast={() => null}>
        <planeGeometry args={[width, 0.5]} />
        <meshBasicMaterial color="#0e7490" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <instancedMesh
        args={[undefined, undefined, heads.length]}
        raycast={() => null}
        onUpdate={(im) => {
          heads.forEach((m, i) => im.setMatrixAt(i, m))
          im.instanceMatrix.needsUpdate = true
        }}
      >
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.3} transparent opacity={0.6} />
      </instancedMesh>
    </group>
  )
}

export function cameraFor(p: Pathway): [number, number, number] {
  const bb = bounds(layoutPathway(p))
  const w = bb.max[0] - bb.min[0]
  const h = bb.max[1] - bb.min[1]
  const d = Math.max(w * 1.2, h * 1.25, 8) + 3
  return [0, 0, d]
}
