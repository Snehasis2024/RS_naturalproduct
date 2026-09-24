import { useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { DomLabel } from '../components/three/Label3D'
import * as THREE from 'three'
import { DEMO_GENE, complement, toRNA, translate, AA_CLASS, AA_NAMES } from '../data/dogma'
import { tick, smooth, clamp01, lerp, type SimClock } from '../engine/clock'
import { SmallMoleculeModel } from '../components/three/MoleculeModel'
import { MOLECULE_MAP } from '../data'

export const BASE_COLOR: Record<string, string> = { A: '#22c55e', T: '#ef4444', G: '#f59e0b', C: '#3b82f6', U: '#f472b6' }
const AA_COLOR = { hydrophobic: '#f59e0b', polar: '#22d3ee', positive: '#60a5fa', negative: '#f87171', special: '#a3e635' }

const CODING = DEMO_GENE.exon1 + DEMO_GENE.intron + DEMO_GENE.exon2
const TEMPLATE = complement(CODING)
const N = CODING.length
const RISE = 0.34 // nm per bp — scene unit = 1 nm
const TWIST = (2 * Math.PI) / 10.5
const RADIUS = 1.0
const MINOR = 0.78 * Math.PI // strands ~140° apart around the axis → major & minor grooves
const MATURE = toRNA(DEMO_GENE.exon1 + DEMO_GENE.exon2)
const CODONS = translate(MATURE)

export type DogmaPick = { kind: string; label: string; text: string; mol?: string }

export const ZOOMS: Record<string, { pos: [number, number, number]; dist: number }> = {
  overview: { pos: [0, 0, 0], dist: 17 },
  'Double helix': { pos: [0, 0, 0], dist: 9 },
  'Base pair': { pos: [0, 0, 0], dist: 3.5 },
  'Nucleotide (dAMP)': { pos: [0, -6, 0], dist: 3.2 },
  'Replication fork': { pos: [0, 0, 0], dist: 7 },
  Helicase: { pos: [0, 0, 0], dist: 4 },
  'DNA polymerase': { pos: [-2, 1.2, 0], dist: 4 },
  'RNA polymerase II': { pos: [0, 0, 0], dist: 6 },
  'Transcription bubble': { pos: [0, 0, 0], dist: 4.5 },
  'Nascent mRNA': { pos: [-1, 2, 0], dist: 6 },
  '5′ cap': { pos: [-7, 0, 0], dist: 4 },
  'Intron (lariat)': { pos: [-2, 2, 0], dist: 6 },
  'Poly(A) tail': { pos: [7, 0, 0], dist: 5 },
  Ribosome: { pos: [0, 0.8, 0], dist: 8 },
  tRNA: { pos: [0, 1.6, 0], dist: 4.5 },
  'Codon / anticodon': { pos: [0, 0.2, 0], dist: 3 },
  'Growing polypeptide': { pos: [0, 4, 0], dist: 5 },
  'Amino acids': { pos: [0, -6, 0], dist: 3.5 },
  Polypeptide: { pos: [0, 0, 0], dist: 14 },
  'α-helix': { pos: [-2.5, 1, 0], dist: 6 },
  'Folded protein': { pos: [0, 0, 0], dist: 9 },
}

function CameraRig({ zoom, stage }: { zoom: string; stage: string }) {
  const { camera, controls } = useThree()
  const target = useRef(new THREE.Vector3())
  const last = useRef('')
  useFrame(() => {
    const z = ZOOMS[zoom] ?? ZOOMS.overview
    const key = `${stage}:${zoom}`
    const c = controls as unknown as { target: THREE.Vector3; update: () => void } | null
    if (last.current !== key) {
      target.current.set(...z.pos)
      last.current = key
      ;(camera.userData as { goal?: THREE.Vector3 }).goal = new THREE.Vector3(z.pos[0] + z.dist * 0.25, z.pos[1] + z.dist * 0.25, z.pos[2] + z.dist)
    }
    const goal = (camera.userData as { goal?: THREE.Vector3 }).goal
    if (goal) {
      camera.position.lerp(goal, 0.06)
      if (camera.position.distanceTo(goal) < 0.05) (camera.userData as { goal?: THREE.Vector3 }).goal = undefined
    }
    if (c) {
      c.target.lerp(target.current, 0.08)
      c.update()
    }
  })
  return null
}

/** Position of nucleotide i on strand s (0 = coding, 1 = template) of a straight B-DNA helix along x. */
function helixPos(i: number, s: number, out = new THREE.Vector3()) {
  const th = i * TWIST + (s ? MINOR : 0)
  return out.set((i - (N - 1) / 2) * RISE, Math.cos(th) * RADIUS, Math.sin(th) * RADIUS)
}

interface Inst {
  mesh: THREE.InstancedMesh | null
  i: number
}
const m4 = new THREE.Matrix4()
const q = new THREE.Quaternion()
const up = new THREE.Vector3(0, 1, 0)
function putSphere(I: Inst, p: THREE.Vector3, r: number, color?: THREE.Color) {
  if (!I.mesh) return
  m4.makeScale(r, r, r).setPosition(p)
  I.mesh.setMatrixAt(I.i, m4)
  if (color) I.mesh.setColorAt(I.i, color)
  I.i++
}
function putStick(I: Inst, a: THREE.Vector3, b: THREE.Vector3, r: number, color?: THREE.Color) {
  if (!I.mesh) return
  const d = b.clone().sub(a)
  const len = d.length()
  if (len < 1e-4) return
  q.setFromUnitVectors(up, d.normalize())
  m4.compose(a.clone().lerp(b, 0.5), q, new THREE.Vector3(r, len, r))
  I.mesh.setMatrixAt(I.i, m4)
  if (color) I.mesh.setColorAt(I.i, color)
  I.i++
}
function finish(I: Inst) {
  if (!I.mesh) return
  I.mesh.count = I.i
  I.mesh.instanceMatrix.needsUpdate = true
  if (I.mesh.instanceColor) I.mesh.instanceColor.needsUpdate = true
}

const col = (hex: string) => new THREE.Color(hex)
const C = { A: col(BASE_COLOR.A), T: col(BASE_COLOR.T), G: col(BASE_COLOR.G), C: col(BASE_COLOR.C), U: col(BASE_COLOR.U) } as Record<string, THREE.Color>
const BB_OLD = col('#94a3b8')
const BB_NEW = col('#67e8f9')
const BB_RNA = col('#f0abfc')
const PRIMER = col('#fb7185')
const CAP = col('#e879f9')
const INTRON = col('#475569')

export function DogmaScene({ stage, clock, zoom, onPick }: { stage: string; clock: React.RefObject<SimClock>; zoom: string; onPick?: (p: DogmaPick) => void }) {
  const spheres = useRef<THREE.InstancedMesh>(null)
  const sticks = useRef<THREE.InstancedMesh>(null)
  const pol = useRef<THREE.Mesh>(null)
  const pol2 = useRef<THREE.Mesh>(null)
  const helicase = useRef<THREE.Mesh>(null)
  const spliceo = useRef<THREE.Mesh>(null)
  const riboSmall = useRef<THREE.Mesh>(null)
  const riboLarge = useRef<THREE.Mesh>(null)
  const pore = useRef<THREE.Mesh>(null)
  const tRNAs = useRef<(THREE.Group | null)[]>([])
  const labelsRef = useRef<Record<string, THREE.Group | null>>({})
  const folding = useMemo(() => {
    // 36-residue illustrative chain: extended line → helix / turn / helix / strand bundle (hypothetical)
    const n = 36
    const ext: THREE.Vector3[] = []
    const fold: THREE.Vector3[] = []
    for (let i = 0; i < n; i++) {
      ext.push(new THREE.Vector3((i - n / 2) * 0.38, Math.sin(i * 0.5) * 0.15, 0))
      if (i < 14) fold.push(new THREE.Vector3(-1.2 + Math.cos(i * 1.745) * 0.23 * 2, -2 + i * 0.15 * 2, Math.sin(i * 1.745) * 0.23 * 2))
      else if (i < 18) fold.push(new THREE.Vector3(-1.2 + (i - 13) * 0.6, 2.4 + Math.sin((i - 14) * 0.9) * 0.5, 0.4))
      else fold.push(new THREE.Vector3(1.2 + Math.cos(i * 1.745) * 0.46, 2 - (i - 18) * 0.3, Math.sin(i * 1.745) * 0.46))
    }
    const seq = 'MKLAEVLKKLAEGNPDGSELVKALLEAAKKLGYE'.padEnd(n, 'G')
    return { ext, fold, seq }
  }, [])

  const state = useRef({ codon: 0, p: 0 })

  useFrame((_, dt) => {
    const c = clock.current
    if (c) tick(c, dt)
    const p = c ? (c.t - c.start) / (c.end - c.start) : 0
    state.current.p = p
    const S: Inst = { mesh: spheres.current, i: 0 }
    const K: Inst = { mesh: sticks.current, i: 0 }
    const show = (m: THREE.Object3D | null, v: boolean) => m && (m.visible = v)
    ;[pol, pol2, helicase, spliceo, riboSmall, riboLarge, pore].forEach((r) => show(r.current, false))
    tRNAs.current.forEach((g) => show(g, false))
    const lab = labelsRef.current
    Object.values(lab).forEach((g) => show(g, false))
    const a = new THREE.Vector3(), b = new THREE.Vector3()

    const drawDuplex = (separate: (i: number) => number, strandShift = 0) => {
      for (let i = 0; i < N; i++) {
        const sep = separate(i)
        const pa = helixPos(i, 0, new THREE.Vector3())
        const pb = helixPos(i, 1, new THREE.Vector3())
        // separated strands straighten and move apart (± y)
        const flatA = new THREE.Vector3(pa.x + strandShift, 1.9, 0)
        const flatB = new THREE.Vector3(pb.x + strandShift, -1.9, 0)
        pa.lerp(flatA, sep)
        pb.lerp(flatB, sep)
        putSphere(S, pa, 0.13, BB_OLD)
        putSphere(S, pb, 0.13, BB_OLD)
        const midA = pa.clone().lerp(pb, 0.5 - 0.5 * sep * 0.6)
        const midB = pb.clone().lerp(pa, 0.5 - 0.5 * sep * 0.6)
        if (sep < 0.02) {
          const mid = pa.clone().lerp(pb, 0.5)
          putStick(K, pa, mid, 0.07, C[CODING[i]])
          putStick(K, mid, pb, 0.07, C[TEMPLATE[i]])
        } else {
          putStick(K, pa, midA, 0.07, C[CODING[i]])
          putStick(K, pb, midB, 0.07, C[TEMPLATE[i]])
        }
        if (i > 0) {
          putStick(K, helixPos(i - 1, 0, a).lerp(new THREE.Vector3(a.x + strandShift, 1.9, 0), separate(i - 1)), pa, 0.05, BB_OLD)
          putStick(K, helixPos(i - 1, 1, b).lerp(new THREE.Vector3(b.x + strandShift, -1.9, 0), separate(i - 1)), pb, 0.05, BB_OLD)
        }
      }
    }

    if (stage === 'dna') {
      drawDuplex(() => 0)
      const n = MOLECULE_MAP['damp'] ? 1 : 0
      if (n) show(lab.nuc ?? null, true)
      show(lab.helix ?? null, true)
    }

    if (stage === 'replication') {
      const forkX = lerp((N / 2) * RISE + 0.5, -(N / 2) * RISE - 0.5, smooth(p)) // fork travels right → left
      const sep = (i: number) => smooth(((i - (N - 1) / 2) * RISE - forkX) / 0.9 + 0.5)
      drawDuplex(sep)
      // new strands: leading (on template, continuous) & lagging (on coding strand, Okazaki fragments)
      for (let i = 0; i < N; i++) {
        const s = sep(i)
        if (s < 0.95) continue
        const x = (i - (N - 1) / 2) * RISE
        const behind = x - forkX
        // leading strand along template (bottom), synthesised right behind the fork
        const leadDone = behind > 0.5
        if (leadDone) {
          const pb = new THREE.Vector3(x, -1.05, 0)
          putSphere(S, pb, 0.12, BB_NEW)
          putStick(K, pb, new THREE.Vector3(x, -1.5, 0), 0.07, C[CODING[i]])
        }
        // lagging strand: fragments of 8 nt made away from the fork, each started by an RNA primer
        const frag = Math.floor(i / 8)
        const fragStart = frag * 8
        const fragFront = (fragStart + 8 - (N - 1) / 2) * RISE
        const lagProgress = clamp01((fragFront - forkX - 0.3) / 2.2)
        const within = (fragStart + 8 - i) / 8
        if (lagProgress > within - 0.125) {
          const pa = new THREE.Vector3(x, 1.05, 0)
          putSphere(S, pa, 0.12, i % 8 >= 6 ? PRIMER : BB_NEW)
          putStick(K, pa, new THREE.Vector3(x, 1.5, 0), 0.07, C[TEMPLATE[i]])
        }
      }
      if (helicase.current) {
        helicase.current.visible = true
        helicase.current.position.set(forkX + 0.3, 0, 0)
        helicase.current.rotation.x += dt * 4
      }
      if (pol.current) {
        pol.current.visible = true
        pol.current.position.set(forkX - 0.5, -1.2, 0)
      }
      if (pol2.current) {
        pol2.current.visible = true
        pol2.current.position.set(forkX - 1.4 - (p * 10 % 1) * 1.5, 1.2, 0)
      }
      ;['fork', 'lead', 'lag'].forEach((k) => show(lab[k] ?? null, true))
      if (lab.fork) lab.fork.position.set(forkX + 0.3, 1.1, 0)
      if (lab.lead) lab.lead.position.set(forkX - 2.5, -2.4, 0)
      if (lab.lag) lab.lag.position.set(forkX - 2.5, 2.4, 0)
    }

    if (stage === 'transcription') {
      const polX = lerp(-(N / 2) * RISE - 0.5, (N / 2) * RISE + 0.5, smooth(p))
      const sep = (i: number) => {
        const x = (i - (N - 1) / 2) * RISE
        return smooth(1 - Math.abs(x - polX) / 2.2) * 0.75
      }
      drawDuplex(sep)
      // nascent RNA: nucleotides already transcribed trail up and back from the polymerase
      const made = Math.floor(clamp01((polX + (N / 2) * RISE) / (N * RISE)) * N)
      const rna = toRNA(CODING)
      let prev: THREE.Vector3 | null = null
      for (let j = made - 1; j >= 0; j--) {
        const k = made - 1 - j // distance from the active site
        const x = polX - 0.2 - Math.min(k, 8) * 0.25
        const y = -0.9 + (k < 8 ? 0 : (k - 8) * 0.22) + Math.min(k, 8) * 0.05
        const z = k < 8 ? 0.3 : 0.3 + Math.sin(k * 0.5) * 0.5
        const pos = new THREE.Vector3(x - (k >= 8 ? (k - 8) * 0.12 : 0), k < 8 ? -1.2 + k * 0.02 : y + 1.2, z)
        putSphere(S, pos, 0.12, BB_RNA)
        putStick(K, pos, pos.clone().add(new THREE.Vector3(0, -0.3, 0)), 0.06, C[rna[j]])
        if (prev) putStick(K, prev, pos, 0.045, BB_RNA)
        prev = pos
      }
      if (pol.current) {
        pol.current.visible = true
        pol.current.position.set(polX, -0.3, 0)
      }
      ;['pol2', 'bubble', 'rna', 'template', 'coding'].forEach((k) => show(lab[k] ?? null, true))
      if (lab.pol2) lab.pol2.position.set(polX, 1.9, 0)
      if (lab.rna) lab.rna.position.set(polX - 3.5, 1.4, 0)
    }

    if (stage === 'processing') {
      const pre = toRNA(CODING)
      const e1 = DEMO_GENE.exon1.length, inL = DEMO_GENE.intron.length
      const cap = smooth(p / 0.15)
      const splice = smooth((p - 0.2) / 0.35)
      const tail = smooth((p - 0.6) / 0.2)
      const exportP = smooth((p - 0.85) / 0.15)
      const spacing = 0.36
      const total = N * spacing
      let prev: THREE.Vector3 | null = null
      for (let i = 0; i < N; i++) {
        const isIntron = i >= e1 && i < e1 + inL
        let x = -total / 2 + i * spacing
        let y = 0
        let z = 0
        if (isIntron) {
          // lariat: intron loops up and away, then fades
          const k = (i - e1) / (inL - 1)
          const ang = k * Math.PI * 2
          const lx = -total / 2 + e1 * spacing + Math.sin(ang) * 0.9
          const ly = 1.4 - Math.cos(ang) * 0.9
          x = lerp(x, lx, splice)
          y = lerp(0, ly, splice) + splice * 0.8 * (p > 0.55 ? (p - 0.55) * 6 : 0)
          if (splice > 0.98 && p > 0.62) continue
        } else if (i >= e1 + inL) {
          x -= inL * spacing * splice
        }
        x += exportP * 8
        const pos = new THREE.Vector3(x, y, z)
        putSphere(S, pos, 0.13, isIntron ? INTRON : BB_RNA)
        putStick(K, pos, pos.clone().add(new THREE.Vector3(0, -0.34, 0)), 0.06, isIntron ? INTRON : C[pre[i]])
        if (prev && !(isIntron && splice > 0.3 && i === e1) && !(i === e1 + inL && splice > 0.3)) putStick(K, prev, pos, 0.045, isIntron ? INTRON : BB_RNA)
        if (i === e1 + inL && splice > 0.3) {
          // ligated exon junction
          const last = new THREE.Vector3(-total / 2 + (e1 - 1) * spacing + exportP * 8, 0, 0)
          putStick(K, last, pos, 0.045, BB_RNA)
        }
        prev = isIntron ? prev : pos
        if (isIntron) prev = pos
      }
      const startX = -total / 2 + exportP * 8
      if (cap > 0) putSphere(S, new THREE.Vector3(startX - 0.45, 0, 0), 0.24 * cap, CAP)
      const endX = -total / 2 + (N - 1 - inL * splice) * spacing + exportP * 8
      const nA = Math.floor(tail * 14)
      for (let k = 1; k <= nA; k++) {
        const pos = new THREE.Vector3(endX + k * spacing, -Math.sin(k * 0.4) * 0.15, 0)
        putSphere(S, pos, 0.12, BB_RNA)
        putStick(K, pos, pos.clone().add(new THREE.Vector3(0, -0.34, 0)), 0.06, C.A)
      }
      if (spliceo.current) {
        spliceo.current.visible = splice > 0.02 && splice < 0.99
        spliceo.current.position.set(-total / 2 + e1 * spacing, 0.9, 0)
      }
      if (pore.current) {
        pore.current.visible = p > 0.7
        pore.current.position.set(9, 0, 0)
      }
      ;['cap', 'intron', 'tail', 'exon1', 'exon2'].forEach((k) => show(lab[k] ?? null, true))
      if (lab.cap) lab.cap.position.set(startX - 0.45, 0.6, 0)
      if (lab.intron) { lab.intron.visible = splice < 0.95 && p < 0.6; lab.intron.position.set(-total / 2 + (e1 + 6) * spacing * (1 - splice) + splice * (-total / 2 + e1 * spacing), 1.2 + splice * 1.4, 0) }
      if (lab.tail) { lab.tail.visible = tail > 0.2; lab.tail.position.set(endX + 2, 0.6, 0) }
      if (lab.exon1) lab.exon1.position.set(-total / 2 + 4 * spacing + exportP * 8, -0.9, 0)
      if (lab.exon2) lab.exon2.position.set(endX - 6 * spacing, -0.9, 0)
      if (lab.pore) { lab.pore.visible = p > 0.7; lab.pore.position.set(9, 1.6, 0) }
    }

    if (stage === 'translation') {
      const nCod = CODONS.length
      const f = clamp01(p) * nCod
      const k = Math.min(nCod - 1, Math.floor(f))
      const within = f - k
      state.current.codon = k
      const spacing = 0.34
      const ribX = 0 // ribosome stays; mRNA slides left (equivalent to ribosome moving 5'→3')
      const shift = -(k + smooth(clamp01((within - 0.6) / 0.4))) * 3 * spacing
      const L = MATURE.length + 10
      let prev: THREE.Vector3 | null = null
      for (let i = 0; i < L; i++) {
        const base = i < MATURE.length ? MATURE[i] : 'A'
        const pos = new THREE.Vector3(ribX + (i - 1) * spacing + shift - 0.5 * spacing * 3, 0, 0)
        putSphere(S, pos, 0.11, BB_RNA)
        putStick(K, pos, pos.clone().add(new THREE.Vector3(0, 0.34, 0)), 0.06, C[base])
        if (prev) putStick(K, prev, pos, 0.04, BB_RNA)
        prev = pos
      }
      if (riboSmall.current) riboSmall.current.visible = true
      if (riboLarge.current) riboLarge.current.visible = true
      // tRNAs in E, P, A sites (A-site tRNA arrives during each cycle)
      const sites = [-3 * spacing * 1.0 - 0.05, 0, 3 * spacing]
      ;[0, 1, 2].forEach((si) => {
        const g = tRNAs.current[si]
        if (!g) return
        const codonIdx = k - 1 + si
        if (codonIdx < 0 || codonIdx >= nCod || CODONS[codonIdx].aa === '*') return
        g.visible = !(si === 0 && within > 0.5)
        const arrive = si === 2 ? smooth(within / 0.4) : 1
        g.position.set(sites[si] + 0.5 * spacing, 0.55 + (1 - arrive) * 3, (1 - arrive) * 2)
        const aaBall = g.children[2] as THREE.Mesh
        const aa = CODONS[codonIdx].aa
        ;(aaBall.material as THREE.MeshStandardMaterial).color.set(AA_COLOR[AA_CLASS[aa] ?? 'special'])
        aaBall.visible = si === 2 || (si === 1 && within < 0.5)
      })
      // polypeptide exits the large subunit
      const made = k + (within > 0.5 ? 1 : 0)
      let prevP: THREE.Vector3 | null = null
      for (let j = 0; j < made; j++) {
        const aa = CODONS[j].aa
        if (aa === '*') continue
        const d = made - 1 - j
        const pos = new THREE.Vector3(0.3 + Math.sin(d * 0.8) * 0.3, 2.2 + d * 0.42, Math.cos(d * 0.8) * 0.3)
        putSphere(S, pos, 0.2, col(AA_COLOR[AA_CLASS[aa] ?? 'special']))
        if (prevP) putStick(K, prevP, pos, 0.06, col('#e2e8f0'))
        prevP = pos
      }
      ;['A', 'P', 'E', 'small', 'large', 'peptide', 'mrna'].forEach((kk) => show(lab[kk] ?? null, true))
      show(lab.aa ?? null, true)
    }

    if (stage === 'folding') {
      const fp = smooth(clamp01((p - 0.1) / 0.7))
      let prev: THREE.Vector3 | null = null
      folding.ext.forEach((e, i) => {
        const pos = e.clone().lerp(folding.fold[i], fp)
        const aa = folding.seq[i]
        putSphere(S, pos, 0.24, col(AA_COLOR[AA_CLASS[aa] ?? 'special']))
        if (prev) putStick(K, prev, pos, 0.08, col('#e2e8f0'))
        prev = pos
      })
      ;['helixA', 'helixB', 'fold'].forEach((kk) => show(lab[kk] ?? null, fp > 0.8))
      show(lab.chain ?? null, fp < 0.3)
    }
    finish(S)
    finish(K)
  })

  const click = (kind: string, label: string, text: string, mol?: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onPick?.({ kind, label, text, mol })
  }

  const L = (key: string, text: string, pos: [number, number, number] = [0, 0, 0]) => (
    <group ref={(g) => void (labelsRef.current[key] = g)} position={pos} visible={false}>
      <HtmlLabel text={text} />
    </group>
  )

  const damp = MOLECULE_MAP['damp']
  const ala = MOLECULE_MAP['alanine']
  const glu = MOLECULE_MAP['glutamate']
  return (
    <group>
      <CameraRig zoom={zoom} stage={stage} />
      <instancedMesh
        ref={spheres}
        args={[undefined, undefined, 600]}
        onClick={click('nucleotide', 'Nucleotide', 'Each sphere is a nucleotide’s sugar–phosphate backbone unit; the coloured stick is its base (A green, T red, G orange, C blue, U pink). Amino acids are coloured by side-chain class.')}
        onUpdate={(im) => im.setColorAt(0, new THREE.Color())}
      >
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial roughness={0.35} emissive="#0e7490" emissiveIntensity={0.15} />
      </instancedMesh>
      <instancedMesh ref={sticks} args={[undefined, undefined, 900]} raycast={() => null} onUpdate={(im) => im.setColorAt(0, new THREE.Color())}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>

      <mesh ref={pol} visible={false} onClick={click(stage === 'transcription' ? 'enzyme' : 'enzyme', stage === 'transcription' ? 'RNA polymerase II' : 'DNA polymerase ε (leading strand)', stage === 'transcription' ? 'Pol II (12 subunits, ~550 kDa) unwinds ~12–14 bp, adds NTPs complementary to the template strand and extrudes RNA 5′→3′. Schematic blob — real Pol II structures: PDB 1I50, 5FLM.' : 'Replicative polymerases extend only 5′→3′ from a primer, with 3′→5′ exonuclease proofreading. Pol ε synthesises the leading strand; Pol δ the lagging strand. Schematic blob.')}>
        <sphereGeometry args={[stage === 'transcription' ? 1.5 : 0.6, 24, 18]} />
        <meshStandardMaterial color={stage === 'transcription' ? '#a78bfa' : '#22d3ee'} transparent opacity={0.35} emissive="#7c3aed" emissiveIntensity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={pol2} visible={false} onClick={click('enzyme', 'DNA polymerase δ (lagging strand)', 'Extends each RNA primer into an Okazaki fragment (~100–200 nt in eukaryotes; shortened here). FEN1/RNase H remove primers and DNA ligase I seals the nicks.')}>
        <sphereGeometry args={[0.55, 20, 16]} />
        <meshStandardMaterial color="#fb7185" transparent opacity={0.4} emissive="#fb7185" emissiveIntensity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={helicase} visible={false} rotation={[0, Math.PI / 2, 0]} onClick={click('enzyme', 'CMG helicase', 'The CMG complex (CDC45–MCM2-7–GINS) encircles one strand and translocates 3′→5′ along the leading-strand template, unwinding the duplex using ATP. Topoisomerases relieve the supercoiling ahead of the fork.')}>
        <torusGeometry args={[0.55, 0.18, 12, 24]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={spliceo} visible={false} onClick={click('complex', 'Spliceosome', 'snRNPs U1 (5′ splice site), U2 (branch point A), U4/U6·U5 assemble on the intron. Two transesterifications release the intron as a lariat and join the exons.')}>
        <sphereGeometry args={[1.1, 24, 18]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.3} emissive="#38bdf8" emissiveIntensity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={pore} visible={false} rotation={[0, Math.PI / 2, 0]} onClick={click('structure', 'Nuclear pore complex', '~110 MDa channel of nucleoporins. Mature mRNPs are exported by NXF1–NXT1 after processing is complete.')}>
        <torusGeometry args={[0.9, 0.25, 12, 32]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={riboSmall} visible={false} position={[0.2, -0.45, 0]} scale={[1.9, 0.7, 1.2]} onClick={click('complex', '40S small subunit', '18S rRNA + ~33 proteins. Decodes the mRNA: codon–anticodon pairing is monitored in the decoding centre of the A site.')}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#fde68a" transparent opacity={0.35} emissive="#fbbf24" emissiveIntensity={0.25} depthWrite={false} />
      </mesh>
      <mesh ref={riboLarge} visible={false} position={[0.2, 1.4, 0]} scale={[2.2, 1.3, 1.5]} onClick={click('complex', '60S large subunit', '28S, 5.8S, 5S rRNA + ~47 proteins. The peptidyl-transferase centre — made of rRNA — forms peptide bonds; the chain exits through a tunnel.')}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#fcd34d" transparent opacity={0.25} emissive="#f59e0b" emissiveIntensity={0.2} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(g) => void (tRNAs.current[i] = g)} visible={false} onClick={click('molecule', 'tRNA', 'Adaptor RNA (~76 nt, L-shaped). Its anticodon pairs with the mRNA codon; the matching amino acid is attached to the 3′-CCA end by aminoacyl-tRNA synthetase. Shape here is schematic.')}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.7, 8]} />
            <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0.25, 0.75, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
            <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0.55, 0.9, 0]}>
            <sphereGeometry args={[0.18, 14, 10]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>
      ))}

      {/* real computed conformers to zoom into */}
      {stage === 'dna' && damp && (
        <group position={[0, -6, 0]} onClick={click('molecule', 'dAMP (deoxyadenosine monophosphate)', 'Computed 3D conformer: phosphate + 2′-deoxyribose + adenine. In DNA, nucleotides are joined by 3′→5′ phosphodiester bonds.', 'damp')}>
          <SmallMoleculeModel mol={damp} scale={0.22} />
        </group>
      )}
      {stage === 'translation' && ala && glu && (
        <group position={[0, -6, 0]}>
          <group position={[-1, 0, 0]} onClick={click('molecule', 'L-Alanine', 'Hydrophobic amino acid (codons GCN). Computed conformer.', 'alanine')}>
            <SmallMoleculeModel mol={ala} scale={0.25} />
          </group>
          <group position={[1, 0, 0]} onClick={click('molecule', 'L-Glutamate', 'Acidic amino acid (codons GAA/GAG). Computed conformer.', 'glutamate')}>
            <SmallMoleculeModel mol={glu} scale={0.25} />
          </group>
        </group>
      )}

      {L('helix', 'B-DNA double helix (10.5 bp/turn)', [0, 1.9, 0])}
      {L('nuc', 'dAMP (computed 3D)', [0, -5, 0])}
      {L('fork', 'Helicase / replication fork')}
      {L('lead', 'Leading strand (continuous)')}
      {L('lag', 'Lagging strand (Okazaki fragments, RNA primers in red)')}
      {L('pol2', 'RNA polymerase II')}
      {L('rna', 'Nascent pre-mRNA (5′→3′)')}
      {L('template', 'Template strand (3′→5′)', [5, -1.6, 0])}
      {L('coding', 'Coding strand', [5, 1.6, 0])}
      {L('cap', '5′ m⁷G cap')}
      {L('intron', 'Intron → lariat')}
      {L('tail', 'Poly(A) tail')}
      {L('exon1', 'Exon 1')}
      {L('exon2', 'Exon 2')}
      {L('pore', 'Nuclear pore → cytoplasm')}
      {L('E', 'E', [-1.1, -1.2, 0.8])}
      {L('P', 'P', [0.2, -1.2, 0.8])}
      {L('A', 'A', [1.4, -1.2, 0.8])}
      {L('small', '40S', [2.4, -0.8, 0])}
      {L('large', '60S', [2.6, 2.2, 0])}
      {L('peptide', 'Growing polypeptide (N-terminus first)', [1.2, 4.5, 0])}
      {L('mrna', 'mRNA 5′ → 3′', [-4, -0.6, 0])}
      {L('aa', 'Free amino acids (computed 3D)', [0, -5, 0])}
      {L('chain', 'Unfolded polypeptide', [0, 1, 0])}
      {L('helixA', 'α-helix', [-1.2, 1.6, 0])}
      {L('helixB', 'α-helix', [1.8, 2.6, 0])}
      {L('fold', 'Hydrophobic core (hypothetical fold)', [0, -2.6, 0])}
    </group>
  )
}

function HtmlLabel({ text }: { text: string }) {
  return <DomLabel text={text} anchor="center" />
}

export function currentCodon(p: number) {
  const nCod = CODONS.length
  const k = Math.min(nCod - 1, Math.floor(clamp01(p) * nCod))
  return { index: k, ...CODONS[k], name: AA_NAMES[CODONS[k].aa] }
}
export const DOGMA_SEQ = { CODING, TEMPLATE, MATURE, CODONS }
