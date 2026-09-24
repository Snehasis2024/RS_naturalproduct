import { useEffect, useMemo, useState } from 'react'
import { SceneShell } from '../components/three/SceneShell'
import { CellCycleScene, CELL_CYCLE_CHROMOSOMES, type CCPick } from '../scenes/CellCycleScene'
import { useSimClock, useClockPoll } from '../engine/clock'
import { PHASES, OFFSETS, TOTAL, phaseAt, phaseStart } from '../engine/cellCycleTimeline'
import { CELL_CYCLE_STRUCTURES, CYCLIN_PROFILES } from '../data/cellCycle'
import { ENTITY_MAP } from '../data'
import { useStore } from '../store/useStore'
import { useRoute, setParam, navigate } from '../store/router'
import { ControlBar, SpeedControl } from '../components/ui/ControlBar'
import { Icon } from '../components/ui/Icon'
import { EvidenceBadge } from '../components/ui/Evidence'

export function CellCycle() {
  const { params } = useRoute()
  const clock = useSimClock({ end: TOTAL, t: phaseStart('G1') })
  const snap = useClockPoll(clock)
  const select = useStore((s) => s.select)
  const showLabels = useStore((s) => s.showLabels)
  const [pick, setPick] = useState<CCPick | null>(null)
  const [showMech, setShowMech] = useState(() => typeof window !== 'undefined' && window.innerWidth > 900)
  const { phase, p, index } = phaseAt(snap.t)

  useEffect(() => {
    const ph = params.get('phase')
    if (ph && PHASES.some((x) => x.id === ph)) {
      clock.current.t = phaseStart(ph) + 0.05
      clock.current.playing = true
      setParam('phase', null)
    }
  }, [params, clock])

  const set = (patch: Partial<typeof clock.current>) => Object.assign(clock.current, patch)
  const jump = (i: number) => set({ t: OFFSETS[Math.max(0, Math.min(PHASES.length - 1, i))] + 0.01 })

  const onPick = (pk: CCPick | null) => {
    setPick(pk)
    if (!pk) return select(null)
    const key = pk.type === 'chromosome' ? 'chromosome' : pk.type
    const info = CELL_CYCLE_STRUCTURES[key]
    const name = pk.type === 'chromosome' ? CELL_CYCLE_CHROMOSOMES[pk.index].name : info.name
    select({
      kind: 'structure',
      id: `cc-${key}`,
      label: name,
      detail: {
        description: info.text,
        evidence: 'simplified',
        sections: [{ title: `Right now: ${phase.name}`, body: phase.events.join('\n') }],
        chips: info.molecules.map((m) => ENTITY_MAP[m]?.name ?? m),
        links: info.molecules.filter((m) => ENTITY_MAP[m]).map((m) => ({ label: `About ${ENTITY_MAP[m].name}`, route: `/regulation?pathway=cell-cycle-regulation&select=${m}` })),
      },
    })
  }

  const sacAttached = phase.id === 'prometaphase' ? CELL_CYCLE_CHROMOSOMES.filter((_, i) => p > 0.25 + i * 0.16).length : index > 5 ? 4 : 0

  return (
    <div className="relative h-full w-full">
      <SceneShell camera={[0, 1.5, 10.5]} minDistance={3} maxDistance={30} onMissed={() => onPick(null)}>
        <CellCycleScene clock={clock} onPick={onPick} selected={pick} labels={showLabels} />
      </SceneShell>

      {/* phase card */}
      <div className="glass pointer-events-auto absolute top-3 left-3 z-10 w-[min(360px,calc(100%-1.5rem))] rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: phase.color, boxShadow: `0 0 12px ${phase.color}` }} />
          <h2 className="text-base font-semibold text-white">{phase.name}</h2>
          <span className="ml-auto text-[10px] text-slate-400">{phase.typical}</span>
        </div>
        <p className="mt-1.5 hidden text-[12.5px] leading-relaxed text-slate-300 sm:block">{phase.summary}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
          <span>DNA content: <b className="font-mono text-cyan-200">{index <= 1 ? '2C' : phase.id === 'S' ? `${(2 + 2 * p).toFixed(1)}C` : index <= 8 ? '4C' : '2C per daughter'}</b></span>
          {phase.id === 'prometaphase' || phase.id === 'metaphase' ? (
            <span className={sacAttached < 4 ? 'text-rose-300' : 'text-emerald-300'}>
              SAC: {sacAttached}/4 bi-oriented {sacAttached < 4 ? '(APC/C inhibited)' : '(satisfied)'}
            </span>
          ) : null}
        </div>
        <button className="mt-2 text-[11px] text-cyan-300 hover:underline" onClick={() => setShowMech(!showMech)}>
          {showMech ? '▾ Hide' : '▸ View'} molecular mechanisms
        </button>
        {showMech && (
          <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
            <ul className="space-y-1 text-[12px] text-slate-300">
              {phase.mechanism.map((m) => (
                <li key={m} className="flex gap-1.5">
                  <span className="text-cyan-400">▹</span>
                  {m}
                </li>
              ))}
            </ul>
            {phase.checkpoint && <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-100">Checkpoint · {phase.checkpoint}</div>}
            <div className="flex flex-wrap gap-1">
              {phase.keyMolecules.map((m) => (
                <button key={m} className="chip" onClick={() => select({ kind: 'protein', id: m, label: ENTITY_MAP[m]?.name ?? m })}>
                  {ENTITY_MAP[m]?.name ?? m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <EvidenceBadge level={phase.evidence} compact />
              <button className="text-[11px] text-cyan-300 hover:underline" onClick={() => navigate('/regulation?pathway=cell-cycle-regulation')}>
                Open the cyclin–CDK network →
              </button>
            </div>
          </div>
        )}
      </div>

      <ControlBar>
        <Timeline t={snap.t} onSeek={(t) => set({ t })} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className="btn" onClick={() => jump(index - 1)} aria-label="Previous phase">
            <Icon name="prev" />
          </button>
          <button className="btn btn-primary" onClick={() => set({ playing: !clock.current.playing, ...(clock.current.t >= TOTAL ? { t: 0 } : {}) })}>
            <Icon name={snap.playing ? 'pause' : 'play'} /> {snap.playing ? 'Pause' : 'Play'}
          </button>
          <button className="btn" onClick={() => jump(index + 1)} aria-label="Next phase">
            <Icon name="next" />
          </button>
          <button className="btn" onClick={() => set({ t: 0, playing: true })}>
            <Icon name="restart" /> Restart
          </button>
          <button className={`btn ${snap.speed <= 0.3 ? 'btn-active' : ''}`} onClick={() => set({ speed: snap.speed <= 0.3 ? 1 : 0.25 })}>
            🐢 Slow motion
          </button>
          <span className="hidden sm:inline-flex"><SpeedControl speed={snap.speed} setSpeed={(v) => set({ speed: v })} /></span>
          <button className={`btn ${clock.current.loop ? 'btn-active' : ''}`} onClick={() => set({ loop: !clock.current.loop })}>
            Loop
          </button>
          <span className="ml-auto hidden text-[11px] text-slate-400 lg:inline">Click chromosomes, spindle fibres, centrosomes, the nuclear envelope or the contractile ring.</span>
        </div>
      </ControlBar>
    </div>
  )
}

function Timeline({ t, onSeek }: { t: number; onSeek: (t: number) => void }) {
  const W = 1000
  const H = 44
  const curves = useMemo(
    () =>
      Object.values(CYCLIN_PROFILES).map((prof) => {
        const pts: string[] = []
        PHASES.forEach((ph, i) => {
          const [a, b] = prof.points[ph.id] ?? [0, 0]
          const x0 = (OFFSETS[i] / TOTAL) * W
          const x1 = ((OFFSETS[i] + ph.seconds) / TOTAL) * W
          pts.push(`${x0},${H - a * (H - 6) - 2}`, `${x1},${H - b * (H - 6) - 2}`)
        })
        return { ...prof, d: `M${pts.join(' L')}` }
      }),
    [],
  )
  return (
    <div>
      <div
        className="relative cursor-pointer select-none"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          onSeek(((e.clientX - r.left) / r.width) * TOTAL)
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-11 w-full">
          {PHASES.map((ph, i) => (
            <rect key={ph.id} x={(OFFSETS[i] / TOTAL) * W} y={0} width={(ph.seconds / TOTAL) * W - 1.5} height={H} fill={ph.color} opacity={0.1} />
          ))}
          {curves.map((c) => (
            <path key={c.label} d={c.d} fill="none" stroke={c.color} strokeWidth={2} vectorEffect="non-scaling-stroke" opacity={0.9} />
          ))}
          <line x1={(t / TOTAL) * W} x2={(t / TOTAL) * W} y1={0} y2={H} stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex">
          {PHASES.map((ph) => (
            <div key={ph.id} style={{ width: `${(ph.seconds / TOTAL) * 100}%` }} className="truncate border-l border-white/10 px-1 text-[10px] text-slate-300">
              <span style={{ color: ph.color }}>{ph.short}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 hidden flex-wrap items-center gap-3 text-[10px] text-slate-400 sm:flex">
        {Object.values(CYCLIN_PROFILES).map((c) => (
          <span key={c.label} className="flex items-center gap-1">
            <span className="h-0.5 w-3" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
        <span>· Cyclin levels are schematic · animation time is not to scale (a human cell cycle takes ~24 h; M phase ~1 h)</span>
      </div>
    </div>
  )
}
