import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SceneShell } from '../components/three/SceneShell'
import * as L from '../scenes/UniverseLevels'
import { navigate } from '../store/router'
import { EvidenceBadge } from '../components/ui/Evidence'

const LEVELS = [
  { name: 'Organism', scale: '~1.7 m', C: L.OrganismLevel, focus: [-0.35, 0.85, 0.25], text: 'A human body contains roughly 30 trillion cells organised into organ systems. We will zoom into the liver.', module: null },
  { name: 'Organ system', scale: '~10–30 cm', C: L.OrganLevel, focus: [-1.4, 1.0, 1.1], text: 'The digestive system; the liver (~1.5 kg) is its largest gland, processing nutrients, drugs and ammonia (urea cycle).', module: '/metabolism?pathway=urea-cycle' },
  { name: 'Tissue', scale: '~1–2 mm', C: L.TissueLevel, focus: [0, 0, 0], text: 'A hepatic lobule: plates of hepatocytes radiate from a central vein; portal triads (artery, portal vein, bile duct) sit at the corners.', module: null },
  { name: 'Cell', scale: '~20–30 µm', C: L.CellLevel, focus: [0.2, 0.1, 0.1], text: 'A hepatocyte-like animal cell with nucleus, abundant ER and mitochondria. Next: the nucleus.', module: '/cell' },
  { name: 'Organelle', scale: '~5–10 µm', C: L.OrganelleLevel, focus: [-0.8, -0.6, 0.8], text: 'The nucleus: double membrane with pores, nucleolus and chromatin (DNA + histones).', module: '/cell?select=nucleus' },
  { name: 'DNA', scale: '~10–30 nm', C: L.DNALevel, focus: [0, 0.9, 0.6], text: 'Chromatin at the nucleosome level: ~147 bp of DNA wrapped around each histone octamer — "beads on a string" (11 nm fibre).', module: '/dogma?stage=dna' },
  { name: 'Gene', scale: '~1–100 kb', C: L.GeneLevel, focus: [-3.6, 0, 0.3], text: 'A protein-coding gene: promoter, UTRs, exons and introns. RNA polymerase II starts transcription at the promoter.', module: '/dogma?stage=transcription' },
  { name: 'Protein', scale: '~5 nm', C: L.ProteinLevel, focus: [0, 0.5, 0], text: 'The encoded polypeptide folds into a 3D structure with a functional active site (schematic fold shown; see the Molecular Viewer for real PDB structures).', module: '/molecules?id=1TUP' },
  { name: 'Molecular interaction', scale: '~10 nm', C: L.InteractionLevel, focus: [0.6, 0.8, 0.2], text: 'A kinase transfers the γ-phosphate of ATP onto a substrate protein — the basic switch of signalling pathways.', module: '/molecules?id=1M17' },
  { name: 'Signaling pathway', scale: 'network', C: L.SignalingLevel, focus: [0, -1, 0], text: 'Phosphorylation relays chain into pathways: EGFR → RAS → RAF → MEK → ERK → gene expression.', module: '/signaling?pathway=egfr-mapk' },
  { name: 'Metabolic pathway', scale: 'network', C: L.MetabolicLevel, focus: [0, 0, 0], text: 'Signals ultimately reprogram metabolism, such as the TCA cycle in the mitochondrial matrix.', module: '/metabolism?pathway=tca' },
] as const

function Rig({ phase, focus }: { phase: 'in' | 'out' | 'idle'; focus: readonly number[] }) {
  const { camera, controls } = useThree()
  const home = useRef(new THREE.Vector3(0, 1, 11))
  useFrame((_, dt) => {
    const c = controls as unknown as { target: THREE.Vector3; update: () => void; enabled: boolean } | null
    const f = new THREE.Vector3(...(focus as [number, number, number]))
    if (phase === 'out') {
      camera.position.lerp(f.clone().add(new THREE.Vector3(0, 0, 0.6)), 1 - Math.exp(-dt * 4))
      c?.target.lerp(f, 1 - Math.exp(-dt * 6))
    } else if (phase === 'in') {
      camera.position.lerp(home.current, 1 - Math.exp(-dt * 3))
      c?.target.lerp(new THREE.Vector3(), 1 - Math.exp(-dt * 4))
    }
    if (c) {
      c.enabled = phase === 'idle'
      c.update()
    }
  })
  return null
}

function Grow({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const s = useRef(0.08)
  useFrame((_, dt) => {
    s.current += (1 - s.current) * (1 - Math.exp(-dt * 3.5))
    ref.current?.scale.setScalar(s.current)
  })
  return <group ref={ref} scale={0.08}>{children}</group>
}

export function Universe() {
  const [level, setLevel] = useState(3)
  const [phase, setPhase] = useState<'in' | 'out' | 'idle'>('in')
  const [flash, setFlash] = useState(false)
  const busy = useRef(false)

  const go = useCallback(
    (target: number) => {
      if (busy.current || target === level || target < 0 || target >= LEVELS.length) return
      busy.current = true
      setPhase('out')
      setTimeout(() => setFlash(true), 550)
      setTimeout(() => {
        setLevel(target)
        setPhase('in')
        setFlash(false)
      }, 850)
      setTimeout(() => {
        setPhase('idle')
        busy.current = false
      }, 2000)
    },
    [level],
  )

  useEffect(() => {
    const t = setTimeout(() => setPhase('idle'), 1200)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'ArrowDown' || e.key === '+' || e.key === '=') go(level + 1)
      if (e.key === 'ArrowUp' || e.key === '-') go(level - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, level])

  const Lv = LEVELS[level]
  const C = Lv.C
  return (
    <div className="relative h-full w-full">
      <SceneShell camera={[0, 1, 11]}>
        <Rig phase={phase} focus={Lv.focus} />
        <Grow key={level}>
          <C />
        </Grow>
      </SceneShell>
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.55),rgba(5,10,24,0.95)_60%)] transition-opacity duration-300 ${flash ? 'opacity-100' : 'opacity-0'}`} />

      <div className="glass pointer-events-auto absolute top-3 left-3 z-10 w-56 rounded-2xl p-2">
        <div className="section-title px-1 pb-1">Biology universe</div>
        <ol>
          {LEVELS.map((l, i) => (
            <li key={l.name}>
              <button onClick={() => go(i)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] ${i === level ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${i === level ? 'bg-cyan-300' : i < level ? 'bg-cyan-700' : 'bg-slate-600'}`} />
                {l.name}
                <span className="ml-auto font-mono text-[9.5px] text-slate-500">{l.scale}</span>
              </button>
              {i < LEVELS.length - 1 && <div className="ml-[11px] h-1.5 border-l border-white/10" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="glass pointer-events-auto absolute right-3 bottom-3 left-3 z-10 rounded-2xl p-3 sm:left-auto sm:w-[420px]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-cyan-300">LEVEL {level + 1}/{LEVELS.length}</span>
          <h2 className="text-lg font-semibold text-white">{Lv.name}</h2>
          <span className="chip ml-auto font-mono">{Lv.scale}</span>
        </div>
        <p className="mt-1 text-[13px] text-slate-300">{Lv.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className="btn" disabled={level === 0} onClick={() => go(level - 1)}>⤴ Zoom out</button>
          <button className="btn btn-primary" disabled={level === LEVELS.length - 1} onClick={() => go(level + 1)}>Zoom in ⤵</button>
          {Lv.module && <button className="btn" onClick={() => navigate(Lv.module!)}>Open module →</button>}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10.5px] text-slate-500">
          <EvidenceBadge level="simplified" compact />
          {level >= 9 ? 'Pathway networks from the JSON pathway engine.' : 'Schematic procedural visualisation; shapes and scales are illustrative.'} Keys: ↑ / ↓.
        </div>
      </div>
    </div>
  )
}
