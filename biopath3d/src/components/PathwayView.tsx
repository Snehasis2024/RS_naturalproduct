import { useEffect, useMemo, useState } from 'react'
import type { Pathway, PathwayEdge, PathwayNode } from '../data/schema'
import { SceneShell } from './three/SceneShell'
import { PathwayScene, cameraFor } from '../scenes/PathwayScene'
import { useSimClock } from '../engine/clock'
import { useStore } from '../store/useStore'
import { navigate } from '../store/router'
import { routeForPathway } from '../engine/search'
import { ENTITY_MAP, PATHWAY_MAP } from '../data'
import { EDGE_COLOR, EDGE_LABEL, NODE_COLOR } from '../scenes/pathwayStyle'
import { EvidenceBadge } from './ui/Evidence'
import { ControlBar, SpeedControl } from './ui/ControlBar'
import { Icon } from './ui/Icon'

export function nodeSelection(p: Pathway, n: PathwayNode) {
  const label = (id: string) => p.nodes.find((x) => x.id === id)?.label ?? id
  const up = p.edges.filter((e) => e.to === n.id).map((e) => `← ${label(e.from)} ${EDGE_LABEL[e.type]} it${e.label ? ` (${e.label})` : ''}`)
  const down = p.edges.filter((e) => e.from === n.id).map((e) => `→ ${EDGE_LABEL[e.type]} ${label(e.to)}${e.label ? ` (${e.label})` : ''}`)
  const links = n.link && PATHWAY_MAP[n.link] ? [{ label: `Open ${PATHWAY_MAP[n.link].name} →`, route: routeForPathway(n.link) }] : []
  return {
    kind: 'pathway-node' as const,
    id: n.ref && ENTITY_MAP[n.ref] ? n.ref : `${p.id}:${n.id}`,
    label: n.label,
    detail: {
      description: n.description,
      evidence: n.evidence ?? p.evidence,
      sections: [{ title: `In ${p.name}`, body: [...up, ...down].join('\n') || 'No direct connections.' }],
      links,
      chips: [n.type.replace('-', ' '), n.compartment ?? ''].filter(Boolean),
    },
  }
}

export function edgeSelection(p: Pathway, e: PathwayEdge) {
  const label = (id: string) => p.nodes.find((x) => x.id === id)?.label ?? id
  const sections = []
  if (e.enzyme) sections.push({ title: 'Enzyme', body: `${e.enzyme.name}${e.enzyme.ec ? ` (EC ${e.enzyme.ec})` : ''}${e.enzyme.regulation ? `\nRegulation: ${e.enzyme.regulation}` : ''}` })
  if (e.cofactorsIn?.length || e.cofactorsOut?.length) sections.push({ title: 'Cofactors', body: `In: ${e.cofactorsIn?.join(', ') || '—'}\nOut: ${e.cofactorsOut?.join(', ') || '—'}` })
  return {
    kind: 'reaction' as const,
    id: `edge:${p.id}:${e.from}>${e.to}`,
    label: `${label(e.from)} → ${label(e.to)}`,
    detail: {
      description: e.description ?? `${label(e.from)} ${EDGE_LABEL[e.type]} ${label(e.to)}${e.label ? ` — ${e.label}` : ''}.`,
      evidence: e.evidence ?? p.evidence,
      sections,
      chips: [e.type, e.reversible ? 'reversible' : ''].filter(Boolean),
      links: e.enzyme?.ref ? [{ label: `About ${ENTITY_MAP[e.enzyme.ref]?.name ?? e.enzyme.name}`, route: `/tutor?about=${e.enzyme.ref}` }] : [],
    },
  }
}

/** Header card + 3D network + step controls for any pathway JSON. */
export function PathwayView({
  pathway,
  initialStep = null,
  preselect,
  compact,
  hideHeader,
}: {
  pathway: Pathway
  initialStep?: number | null
  preselect?: string | null
  compact?: boolean
  hideHeader?: boolean
}) {
  const clock = useSimClock({ end: 1e9 })
  const select = useStore((s) => s.select)
  const selection = useStore((s) => s.selection)
  const showLabels = useStore((s) => s.showLabels)
  const [step, setStep] = useState<number | null>(initialStep)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [info, setInfo] = useState(!compact && typeof window !== 'undefined' && window.innerWidth > 1700)
  const steps = pathway.steps ?? []

  useEffect(() => {
    setStep(initialStep)
    setPlaying(false)
  }, [pathway.id, initialStep])

  useEffect(() => {
    clock.current.speed = speed
  }, [speed, clock])

  useEffect(() => {
    if (!preselect) return
    const n = pathway.nodes.find((x) => x.ref === preselect || x.id === preselect)
    if (n) select(nodeSelection(pathway, n))
  }, [preselect, pathway, select])

  useEffect(() => {
    if (!playing || !steps.length) return
    const id = setInterval(() => setStep((s) => (s === null ? 0 : s + 1 >= steps.length ? 0 : s + 1)), 4200 / speed)
    return () => clearInterval(id)
  }, [playing, speed, steps.length])

  const cur = step !== null ? steps[step] : null
  const cam = useMemo(() => cameraFor(pathway), [pathway])
  const selectedId = selection?.kind === 'pathway-node' ? (selection.id.includes(':') ? selection.id.split(':')[1] : selection.id) : null
  const legendTypes = useMemo(() => [...new Set(pathway.edges.map((e) => e.type))], [pathway])
  const nodeTypes = useMemo(() => [...new Set(pathway.nodes.map((n) => n.type))], [pathway])

  return (
    <div className="relative h-full w-full">
      <SceneShell key={pathway.id} camera={cam} maxDistance={80} onMissed={() => select(null)}>
        <PathwayScene
          pathway={pathway}
          clock={clock}
          focusNodes={cur?.nodes}
          focusEdges={cur?.edges}
          selected={selectedId}
          labels={showLabels}
          onSelectNode={(n) => select(nodeSelection(pathway, n))}
          onSelectEdge={(e) => select(edgeSelection(pathway, e))}
        />
      </SceneShell>

      {!hideHeader && (
        <div className="glass pointer-events-auto absolute top-3 right-3 z-10 w-[min(360px,calc(100%-1.5rem))] rounded-2xl p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h2 className="text-base leading-tight font-semibold text-white">{pathway.name}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <EvidenceBadge level={pathway.evidence} />
                {info && pathway.location && <span className="chip">{pathway.location}</span>}
              </div>
            </div>
            <button className="text-[11px] text-cyan-300" onClick={() => setInfo(!info)}>
              {info ? 'less' : 'more'}
            </button>
          </div>
          {info && (
            <div className="scroll-thin mt-2 max-h-[40vh] space-y-2 overflow-y-auto text-[12.5px] leading-relaxed text-slate-300">
              <p>{pathway.summary}</p>
              {pathway.outcomes && <p><span className="section-title">Outcomes </span>{pathway.outcomes.join(' · ')}</p>}
              {pathway.clinical && <p><span className="section-title">Clinical </span>{pathway.clinical}</p>}
              <div>
                <div className="section-title mb-1">Legend</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  {legendTypes.map((t) => (
                    <span key={t} className="flex items-center gap-1">
                      <span className="h-1 w-4 rounded" style={{ background: EDGE_COLOR[t] }} />
                      {EDGE_LABEL[t]}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  {nodeTypes.map((t) => (
                    <span key={t} className="flex items-center gap-1 capitalize">
                      <span className="h-2 w-2 rounded-full" style={{ background: NODE_COLOR[t] }} />
                      {t.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              {pathway.references && (
                <div>
                  <div className="section-title mb-1">References</div>
                  {pathway.references.map((r) => (
                    <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="block text-[11px] text-cyan-300 hover:underline">
                      {r.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ControlBar className={compact ? 'p-2' : ''}>
        {cur ? (
          <div className="mb-2 px-1">
            <div className="text-sm font-semibold text-cyan-100">{cur.title}</div>
            <p className="text-[12.5px] leading-relaxed text-slate-300">{cur.text}</p>
          </div>
        ) : (
          <p className="mb-2 px-1 text-[12px] text-slate-400">
            {steps.length ? 'Signal flowing through the whole network. Press Play or Next to walk through it step by step.' : 'Signal particles travel along each interaction. Click nodes and arrows for details.'}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {steps.length > 0 && (
            <>
              <button className="btn" onClick={() => setStep((s) => (s === null || s === 0 ? null : s - 1))} aria-label="Previous step">
                <Icon name="prev" />
              </button>
              <button className="btn btn-primary" onClick={() => { setPlaying(!playing); if (step === null) setStep(0) }}>
                <Icon name={playing ? 'pause' : 'play'} /> {playing ? 'Pause' : 'Play steps'}
              </button>
              <button className="btn" onClick={() => setStep((s) => (s === null ? 0 : Math.min(steps.length - 1, s + 1)))} aria-label="Next step">
                <Icon name="next" />
              </button>
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <button key={i} onClick={() => { setStep(i); setPlaying(false) }} className={`h-2 w-5 rounded-full ${i === step ? 'bg-cyan-400' : 'bg-white/15 hover:bg-white/30'}`} aria-label={`Step ${i + 1}`} />
                ))}
              </div>
            </>
          )}
          <button className={`btn ${step === null ? 'btn-active' : ''}`} onClick={() => { setStep(null); setPlaying(false) }}>
            Whole pathway
          </button>
          <SpeedControl speed={speed} setSpeed={setSpeed} />
          {!compact && (
            <button className="btn ml-auto" onClick={() => navigate('/tutor')}>
              🤖 Explain this pathway
            </button>
          )}
        </div>
      </ControlBar>
    </div>
  )
}
