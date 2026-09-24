import { useEffect, useMemo, useState } from 'react'
import { MOLECULE_MAP, PATHWAY_MAP, pathwaysBy } from '../data'
import type { EnergyDelta, Pathway } from '../data/schema'
import { reactionOrder, ledger } from '../engine/metabolism'
import { SceneShell } from '../components/three/SceneShell'
import { PathwayScene, cameraFor } from '../scenes/PathwayScene'
import { SmallMoleculeModel } from '../components/three/MoleculeModel'
import { escapeHtml } from '../components/three/Label3D'
import { useSimClock } from '../engine/clock'
import { useStore } from '../store/useStore'
import { useRoute, navigate } from '../store/router'
import { edgeSelection, nodeSelection } from '../components/PathwayView'
import { ControlBar, SpeedControl } from '../components/ui/ControlBar'
import { EvidenceBadge } from '../components/ui/Evidence'
import { Icon } from '../components/ui/Icon'

const LEDGER: { key: keyof EnergyDelta; label: string; color: string }[] = [
  { key: 'atp', label: 'ATP', color: '#34d399' },
  { key: 'gtp', label: 'GTP', color: '#2dd4bf' },
  { key: 'nadh', label: 'NADH', color: '#60a5fa' },
  { key: 'fadh2', label: 'FADH₂', color: '#a78bfa' },
  { key: 'nadph', label: 'NADPH', color: '#f472b6' },
  { key: 'co2', label: 'CO₂', color: '#94a3b8' },
  { key: 'hplus', label: 'H⁺ pumped', color: '#fbbf24' },
]

export function MetabolicView({ pathway, initialStep = null, compact }: { pathway: Pathway; initialStep?: number | null; compact?: boolean }) {
  const clock = useSimClock({ end: 1e9 })
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  const showLabels = useStore((s) => s.showLabels)
  const [step, setStep] = useState<number | null>(initialStep)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [molecules, setMolecules] = useState(true)
  const [info, setInfo] = useState(typeof window !== 'undefined' && window.innerWidth > 1700)
  const order = useMemo(() => reactionOrder(pathway), [pathway])
  const tot = ledger(order, step)
  const cur = step !== null ? order[step] : null
  const label = (id: string) => pathway.nodes.find((n) => n.id === id)?.label ?? id

  useEffect(() => {
    setStep(initialStep)
    setPlaying(false)
  }, [pathway.id, initialStep])
  useEffect(() => void (clock.current.speed = speed), [speed, clock])
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setStep((s) => (s === null ? 0 : s + 1 >= order.length ? 0 : s + 1)), 3200 / speed)
    return () => clearInterval(id)
  }, [playing, speed, order.length])
  useEffect(() => {
    if (cur) select(edgeSelection(pathway, cur))
  }, [cur, pathway, select])

  const cam = useMemo(() => cameraFor(pathway), [pathway])
  const selectedId = selection?.kind === 'pathway-node' ? selection.id.split(':').pop()! : null

  return (
    <div className="relative h-full w-full">
      <SceneShell key={pathway.id} camera={cam} maxDistance={80} onMissed={() => select(null)}>
        <PathwayScene
          pathway={pathway}
          clock={clock}
          focusNodes={cur ? [cur.from, cur.to] : undefined}
          focusEdges={cur ? [[cur.from, cur.to]] : undefined}
          selected={selectedId}
          labels={showLabels}
          onSelectNode={(n) => select(nodeSelection(pathway, n))}
          onSelectEdge={(e) => select(edgeSelection(pathway, e))}
          renderNode={(n) => {
            const mol = n.mol && molecules ? MOLECULE_MAP[n.mol] : null
            if (!mol) return null
            const size = Math.max(...mol.atoms.map((a) => Math.hypot(a[1], a[2], a[3])))
            return (
              <group rotation={[0.3, 0, 0]}>
                <SmallMoleculeModel mol={mol} showH={false} scale={Math.min(0.2, 0.95 / size)} />
              </group>
            )
          }}
          edgeTag={(e, active) => {
            if (!e.enzyme) return null
            const energy = Object.entries(e.energy ?? {})
              .map(([k, v]) => {
                const L = LEDGER.find((x) => x.key === k)
                if (!L || !v) return ''
                const unit = L.key === 'hplus' ? ' H⁺' : ` ${L.label}`
                return `<span style="margin-left:4px;font-weight:600;color:${v > 0 ? L.color : '#f87171'}">${v > 0 ? '+' : ''}${v}${unit}${e.multiplier && e.multiplier > 1 ? ` ×${e.multiplier}` : ''}</span>`
              })
              .join('')
            const cls = active ? 'border-color:rgba(103,232,249,.6);background:rgba(2,6,23,.85);color:#cffafe' : 'border-color:rgba(255,255,255,.1);background:rgba(2,6,23,.6);color:#94a3b8'
            return `<div style="border:1px solid;border-radius:6px;padding:1px 6px;font-size:9.5px;white-space:nowrap;${cls}">${escapeHtml(e.enzyme.name)}${energy}</div>`
          }}
        />
      </SceneShell>

      {!compact && (
        <div className="glass pointer-events-auto absolute top-3 right-3 z-10 w-[min(330px,calc(100%-1.5rem))] rounded-2xl p-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold text-white">{pathway.name}</h2>
            <button className="text-[11px] text-cyan-300" onClick={() => setInfo(!info)}>
              {info ? 'less' : 'more'}
            </button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <EvidenceBadge level={pathway.evidence} />
            {info && pathway.location && <span className="chip">{pathway.location}</span>}
          </div>
          {info && <p className="mt-2 text-[12px] leading-relaxed text-slate-300">{pathway.summary}</p>}
          {info && pathway.net && <p className="mt-2 rounded-lg bg-black/25 p-2 font-mono text-[10.5px] text-cyan-100">{pathway.net}</p>}
          {info && pathway.clinical && <p className="mt-2 text-[11.5px] text-slate-400"><span className="section-title">Clinical </span>{pathway.clinical}</p>}
          {info && pathway.references && (
            <div className="mt-2 flex flex-wrap gap-x-2">
              {pathway.references.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-[10.5px] text-cyan-300 hover:underline">
                  {r.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <ControlBar>
        <div className="mb-2 flex flex-wrap items-center gap-3 px-1">
          <span className="section-title">Energy ledger {step !== null ? `(through step ${step + 1}/${order.length})` : '(whole pathway)'}</span>
          {LEDGER.map((L) => {
            const v = tot[L.key] ?? 0
            if (!v && !['atp', 'nadh'].includes(L.key)) return null
            return (
              <span key={L.key} className="flex items-center gap-1 font-mono text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: L.color }} />
                <span className="text-slate-400">{L.label}</span>
                <b style={{ color: v < 0 ? '#f87171' : L.color }}>{v > 0 ? '+' : ''}{Math.round(v * 10) / 10}</b>
              </span>
            )
          })}
        </div>
        {cur && (
          <div className="mb-2 px-1 text-[12.5px] text-slate-300">
            <b className="text-cyan-100">{step! + 1}. {label(cur.from)} → {label(cur.to)}</b>
            {cur.enzyme && <> · {cur.enzyme.name}{cur.enzyme.ec && <span className="font-mono text-slate-400"> (EC {cur.enzyme.ec})</span>}</>}
            {cur.cofactorsIn?.length ? <> · in: {cur.cofactorsIn.join(', ')}</> : null}
            {cur.cofactorsOut?.length ? <> · out: {cur.cofactorsOut.join(', ')}</> : null}
            {cur.reversible === false || (!cur.reversible && cur.enzyme) ? <span className="ml-1 text-amber-300">· irreversible</span> : null}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={() => setStep((s) => (s === null || s === 0 ? null : s - 1))} aria-label="Previous reaction">
            <Icon name="prev" />
          </button>
          <button className="btn btn-primary" onClick={() => { setPlaying(!playing); if (step === null) setStep(0) }}>
            <Icon name={playing ? 'pause' : 'play'} /> {playing ? 'Pause' : 'Step through'}
          </button>
          <button className="btn" onClick={() => setStep((s) => (s === null ? 0 : Math.min(order.length - 1, s + 1)))} aria-label="Next reaction">
            <Icon name="next" />
          </button>
          <button className={`btn ${step === null ? 'btn-active' : ''}`} onClick={() => { setStep(null); setPlaying(false) }}>
            Net flux
          </button>
          <button className={`btn ${molecules ? 'btn-active' : ''}`} onClick={() => setMolecules(!molecules)} title="Show metabolites as computed 3D conformers">
            3D molecules
          </button>
          <SpeedControl speed={speed} setSpeed={setSpeed} />
          {!compact && <span className="text-[10.5px] text-slate-500">Metabolite models: RDKit-computed conformers (not crystal structures). Click a metabolite, arrow or enzyme.</span>}
        </div>
      </ControlBar>
    </div>
  )
}

export function Metabolism() {
  const { params } = useRoute()
  const list = useMemo(() => pathwaysBy('metabolic'), [])
  const pathway = PATHWAY_MAP[params.get('pathway') ?? ''] ?? PATHWAY_MAP['glycolysis']
  const [open, setOpen] = useState(typeof window !== 'undefined' && window.innerWidth > 1600)
  const step = params.get('step')
  return (
    <div className="relative h-full w-full">
      <MetabolicView pathway={pathway} initialStep={step ? +step : null} />
      <div className="glass pointer-events-auto absolute top-3 left-3 z-10 w-52 rounded-2xl p-2">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="section-title">Metabolic pathways</span>
          <button className="text-[11px] text-cyan-300" onClick={() => setOpen(!open)}>
            {open ? 'hide' : 'show'}
          </button>
        </div>
        {open && (
          <ul className="space-y-0.5">
            {list.map((p) => (
              <li key={p.id}>
                <button onClick={() => navigate(`/metabolism?pathway=${p.id}`)} className={`w-full rounded-md px-2 py-1.5 text-left text-[12px] ${p.id === pathway.id ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5'}`}>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
