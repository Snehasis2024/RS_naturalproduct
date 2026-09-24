import { useEffect, useState } from 'react'
import { SceneShell } from '../components/three/SceneShell'
import { DogmaScene, currentCodon, DOGMA_SEQ, BASE_COLOR, type DogmaPick } from '../scenes/DogmaScene'
import { DOGMA_STAGES, AA_NAMES } from '../data/dogma'
import { useSimClock, useClockPoll } from '../engine/clock'
import { useStore } from '../store/useStore'
import { useRoute, setParam, navigate } from '../store/router'
import { ControlBar, SpeedControl } from '../components/ui/ControlBar'
import { EvidenceBadge } from '../components/ui/Evidence'
import { Icon } from '../components/ui/Icon'
import { ENTITY_MAP } from '../data'

const DURATION = 16

export function DogmaStage({ stage, compact }: { stage: string; compact?: boolean }) {
  const clock = useSimClock({ end: DURATION, loop: true })
  const snap = useClockPoll(clock)
  const select = useStore((s) => s.select)
  const [zoom, setZoom] = useState('overview')
  const [info, setInfo] = useState(typeof window !== 'undefined' && window.innerWidth > 1700)
  const st = DOGMA_STAGES.find((s) => s.id === stage) ?? DOGMA_STAGES[0]
  const p = snap.t / DURATION
  const sub = Math.min(st.steps.length - 1, Math.floor(p * st.steps.length))

  useEffect(() => {
    clock.current.t = 0
    clock.current.playing = true
    setZoom('overview')
  }, [stage, clock])

  const set = (patch: Partial<typeof clock.current>) => Object.assign(clock.current, patch)
  const onPick = (pk: DogmaPick) => {
    const e = pk.mol ? null : pk.label.startsWith('RNA polymerase') ? ENTITY_MAP['rnapol2'] : null
    select({
      kind: 'structure',
      id: e?.id ?? `dogma:${pk.label}`,
      label: pk.label,
      detail: {
        description: pk.text,
        evidence: st.evidence,
        links: pk.mol ? [{ label: 'Open in Molecular Viewer', route: `/molecules?id=${pk.mol}` }] : [],
      },
    })
  }
  const codon = currentCodon(p)

  return (
    <div className="relative h-full w-full">
      <SceneShell camera={[4, 4, 17]} minDistance={1.5} maxDistance={50}>
        <DogmaScene stage={stage} clock={clock} zoom={zoom} onPick={onPick} />
      </SceneShell>

      {!compact && (
        <div className="glass pointer-events-auto absolute top-3 right-3 z-10 w-[min(360px,calc(100%-1.5rem))] rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">{st.name}</h2>
            <button className="ml-auto text-[11px] text-cyan-300" onClick={() => setInfo(!info)}>{info ? 'less' : 'more'}</button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5"><EvidenceBadge level={st.evidence} /><span className="chip">{st.where}</span></div>
          {info && <p className="mt-2 text-[12.5px] leading-relaxed text-slate-300">{st.summary}</p>}
          <ol className="mt-2 space-y-1">
            {st.steps.map((s, i) => (!info && i !== sub ? null :
              <li key={s} className={`flex gap-2 rounded-md px-1.5 py-1 text-[12px] ${i === sub ? 'bg-cyan-400/15 text-cyan-50' : 'text-slate-400'}`}>
                <span className="font-mono text-cyan-300">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          {stage === 'translation' && (
            <div className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2 text-[12px]">
              <div className="section-title mb-1">Decoding now</div>
              <div className="font-mono text-sm">
                codon <b style={{ color: '#f0abfc' }}>{codon.codon}</b> → <b className="text-amber-300">{codon.aa === '*' ? 'STOP' : codon.aa}</b> <span className="text-slate-400">({codon.name})</span>
              </div>
              <div className="mt-1 font-mono text-[11px] break-all text-slate-400">
                {DOGMA_SEQ.CODONS.map((c, i) => (
                  <span key={i} className={i === codon.index ? 'rounded bg-cyan-400/20 text-cyan-100' : ''}>
                    {c.codon}
                    <sub className="text-amber-300/80">{c.aa === '*' ? '■' : c.aa}</sub>{' '}
                  </span>
                ))}
              </div>
            </div>
          )}
          {info && (stage === 'dna' || stage === 'transcription') && (
            <div className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2 font-mono text-[10.5px] leading-relaxed break-all">
              <div><span className="text-slate-500">coding  5′ </span>{[...DOGMA_SEQ.CODING].map((b, i) => <span key={i} style={{ color: BASE_COLOR[b] }}>{b}</span>)}<span className="text-slate-500"> 3′</span></div>
              <div><span className="text-slate-500">template 3′ </span>{[...DOGMA_SEQ.TEMPLATE].map((b, i) => <span key={i} style={{ color: BASE_COLOR[b] }}>{b}</span>)}<span className="text-slate-500"> 5′</span></div>
              <div className="mt-1 text-slate-500">Illustrative two-exon sequence (not a real gene).</div>
            </div>
          )}
        </div>
      )}

      <ControlBar>
        {!compact && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="section-title mr-1">Zoom into</span>
            <button className={`btn px-2 py-1 text-[11px] ${zoom === 'overview' ? 'btn-active' : ''}`} onClick={() => setZoom('overview')}>Overview</button>
            {st.zoomTargets.map((z) => (
              <button key={z} className={`btn px-2 py-1 text-[11px] ${zoom === z ? 'btn-active' : ''}`} onClick={() => setZoom(z)}>
                {z}
              </button>
            ))}
            {stage === 'translation' && <button className={`btn px-2 py-1 text-[11px] ${zoom === 'Amino acids' ? 'btn-active' : ''}`} onClick={() => setZoom('Amino acids')}>Amino acids</button>}
            {stage === 'folding' && <button className="btn px-2 py-1 text-[11px]" onClick={() => navigate('/molecules?id=1UBQ')}>Real fold: ubiquitin (PDB 1UBQ) →</button>}
          </div>
        )}
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${p * 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" onClick={() => set({ playing: !clock.current.playing })}>
            <Icon name={snap.playing ? 'pause' : 'play'} /> {snap.playing ? 'Pause' : 'Play'}
          </button>
          <button className="btn" onClick={() => set({ t: ((sub + 1) % st.steps.length) * (DURATION / st.steps.length) + 0.01, playing: false })}>
            <Icon name="next" /> Step
          </button>
          <button className="btn" onClick={() => set({ t: 0, playing: true })}>
            <Icon name="restart" /> Restart
          </button>
          <button className={`btn ${snap.speed <= 0.3 ? 'btn-active' : ''}`} onClick={() => set({ speed: snap.speed <= 0.3 ? 1 : 0.25 })}>🐢 Slow</button>
          <SpeedControl speed={snap.speed} setSpeed={(v) => set({ speed: v })} />
        </div>
      </ControlBar>
    </div>
  )
}

export function CentralDogma() {
  const { params } = useRoute()
  const [stage, setStage] = useState(params.get('stage') ?? 'dna')
  useEffect(() => {
    const s = params.get('stage')
    if (s) {
      setStage(s)
      setParam('stage', null)
    }
  }, [params])
  return (
    <div className="relative h-full w-full">
      <DogmaStage stage={stage} />
      <div className="glass pointer-events-auto absolute top-3 left-3 z-10 rounded-2xl p-2">
        <div className="section-title px-1 pb-1">Central dogma</div>
        <div className="flex flex-col gap-0.5">
          {DOGMA_STAGES.map((s, i) => (
            <button key={s.id} onClick={() => setStage(s.id)} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] ${stage === s.id ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5'}`}>
              <span className="font-mono text-[10px] text-slate-500">{i + 1}</span>
              {s.name}
            </button>
          ))}
        </div>
        <div className="mt-1 px-1 text-[10px] text-slate-500">DNA → RNA → protein</div>
      </div>
    </div>
  )
}

export { AA_NAMES }
