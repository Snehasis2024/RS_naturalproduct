import { useEffect, useMemo, useState } from 'react'
import { SceneShell } from '../components/three/SceneShell'
import { CellModel } from '../components/three/cell/CellModel'
import { ORGANELLES } from '../data/organelles'
import { useStore } from '../store/useStore'
import { useRoute, setParam } from '../store/router'
import { ControlBar, Toolbar } from '../components/ui/ControlBar'
import { EvidenceBadge } from '../components/ui/Evidence'

const COLORS: Record<string, string> = {
  membrane: '#38bdf8', cytoplasm: '#7dd3fc', nucleus: '#8b5cf6', nucleolus: '#f0abfc', mitochondria: '#fb7185', ribosomes: '#fde68a',
  er: '#0ea5e9', golgi: '#f59e0b', lysosomes: '#8b5cf6', peroxisomes: '#10b981', centrosome: '#67e8f9',
}

export function CellExplorer() {
  const { params } = useRoute()
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const showLabels = useStore((s) => s.showLabels)
  const setShowLabels = useStore((s) => s.setShowLabels)
  const [hover, setHover] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [isolate, setIsolate] = useState<string | null>(null)
  const [explode, setExplode] = useState(0)
  const [transparent, setTransparent] = useState(false)
  const [listOpen, setListOpen] = useState(typeof window !== 'undefined' && window.innerWidth > 900)
  const [viewKey, setViewKey] = useState(0)

  const selectedOrganelle = selection && ORGANELLES.some((o) => o.id === selection.id) ? selection.id : null

  const choose = (id: string | null) => {
    if (!id) return select(null)
    const o = ORGANELLES.find((x) => x.id === id)
    if (o) select({ kind: 'organelle', id: o.id, label: o.name })
  }

  useEffect(() => {
    const id = params.get('select')
    if (id) {
      choose(id)
      setParam('select', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const hiddenSet = useMemo(() => hidden, [hidden])

  return (
    <div className="relative h-full w-full">
      <SceneShell key={viewKey} camera={[0, 3, 14]} minDistance={3} maxDistance={40} onMissed={() => select(null)}>
        <CellModel
          hover={hover}
          selected={selectedOrganelle}
          isolate={isolate}
          hidden={hiddenSet}
          explode={explode}
          transparent={transparent}
          labels={showLabels}
          onHover={setHover}
          onSelect={choose}
        />
      </SceneShell>

      <Toolbar className="w-60">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <span className="section-title">Organelles</span>
          <button className="text-[11px] text-cyan-300" onClick={() => setListOpen(!listOpen)}>
            {listOpen ? 'hide' : 'show'}
          </button>
        </div>
        {listOpen && (
          <ul className="scroll-thin max-h-[42vh] space-y-0.5 overflow-y-auto">
            {ORGANELLES.map((o) => (
              <li key={o.id} className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-[12px] ${selectedOrganelle === o.id ? 'bg-cyan-400/15' : hover === o.id ? 'bg-white/5' : ''}`}>
                <input
                  type="checkbox"
                  checked={!hidden.has(o.id)}
                  onChange={() => {
                    const n = new Set(hidden)
                    if (n.has(o.id)) n.delete(o.id)
                    else n.add(o.id)
                    setHidden(n)
                  }}
                  aria-label={`Show ${o.name}`}
                  className="accent-cyan-400"
                />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[o.id] }} />
                <button className="flex-1 truncate text-left text-slate-200 hover:text-white" onMouseEnter={() => setHover(o.id)} onMouseLeave={() => setHover(null)} onClick={() => choose(o.id)}>
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {listOpen && (
          <div className="mt-2 flex gap-1 px-1">
            <button className="btn px-2 py-1 text-[11px]" onClick={() => setHidden(new Set())}>
              Show all
            </button>
            <button className="btn px-2 py-1 text-[11px]" onClick={() => setHidden(new Set(ORGANELLES.map((o) => o.id).filter((id) => id !== 'membrane' && id !== 'nucleus')))}>
              Only nucleus
            </button>
          </div>
        )}
      </Toolbar>

      <ControlBar>
        <div className="flex flex-wrap items-center gap-2">
          <button className={`btn ${showLabels ? 'btn-active' : ''}`} onClick={() => setShowLabels(!showLabels)}>
            Labels
          </button>
          <button className={`btn ${transparent ? 'btn-active' : ''}`} onClick={() => setTransparent(!transparent)}>
            Transparent cell
          </button>
          <button className={`btn ${explode > 0.5 ? 'btn-active' : ''}`} onClick={() => setExplode(explode > 0.5 ? 0 : 1)}>
            Explode view
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(parseFloat(e.target.value))} className="w-24" aria-label="Explode amount" />
          </label>
          <button
            className={`btn ${isolate ? 'btn-active' : ''}`}
            disabled={!selectedOrganelle && !isolate}
            onClick={() => setIsolate(isolate ? null : selectedOrganelle)}
            title="Show only the selected organelle"
          >
            {isolate ? 'Exit isolate' : 'Isolate selected'}
          </button>
          <button className="btn" onClick={() => { setViewKey((k) => k + 1); setExplode(0); setIsolate(null); setTransparent(false) }}>
            Reset view
          </button>
          <span className="ml-auto hidden items-center gap-2 text-[11px] text-slate-400 xl:flex">
            <EvidenceBadge level="simplified" compact /> Procedural model — shapes schematic, relative sizes not to scale
          </span>
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-slate-400">
          {hover ? <>Hovering: <b className="text-cyan-200">{ORGANELLES.find((o) => o.id === hover)?.name}</b> — click for details.</> : 'Drag to rotate · scroll/pinch to zoom · right-drag to pan · click an organelle. Yellow vesicles show ER → Golgi → membrane secretory traffic.'}
        </div>
      </ControlBar>
    </div>
  )
}
