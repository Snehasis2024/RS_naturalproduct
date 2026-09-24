import { useMemo, useState } from 'react'
import { PATHWAY_MAP, pathwaysBy } from '../data'
import type { PathwayCategory } from '../data/schema'
import { PathwayView } from '../components/PathwayView'
import { useRoute, navigate } from '../store/router'

const TITLES: Record<string, string> = {
  signaling: 'Signaling pathway lab',
  regulation: 'Cell-cycle regulation',
  map: 'Pathway connection map',
}

export function PathwayLab({ category }: { category: PathwayCategory }) {
  const { params, path } = useRoute()
  const list = useMemo(() => pathwaysBy(category), [category])
  const requested = params.get('pathway')
  const pathway = (requested && PATHWAY_MAP[requested]) || (category === 'regulation' ? PATHWAY_MAP['cell-cycle-regulation'] : list[0])
  const [open, setOpen] = useState(typeof window !== 'undefined' && window.innerWidth > 1600)
  const step = params.get('step')
  return (
    <div className="relative h-full w-full">
      <PathwayView pathway={pathway} preselect={params.get('select')} initialStep={step ? +step : null} />
      {list.length > 1 && (
        <div className="glass pointer-events-auto absolute top-3 left-3 z-10 w-56 rounded-2xl p-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="section-title">{TITLES[category] ?? 'Pathways'}</span>
            <button className="text-[11px] text-cyan-300" onClick={() => setOpen(!open)}>
              {open ? 'hide' : 'show'}
            </button>
          </div>
          {open && (
            <ul className="scroll-thin max-h-[50vh] space-y-0.5 overflow-y-auto">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => navigate(`${path}?pathway=${p.id}`)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-[12px] ${p.id === pathway.id ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5'}`}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && category === 'signaling' && (
            <p className="px-1 pt-2 text-[10px] leading-snug text-slate-500">
              Pathways are loaded from JSON files in <code>src/data/pathways/</code>. Drop in a new file to add one.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
