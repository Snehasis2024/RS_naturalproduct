import { useState } from 'react'
import { PATHWAY_MAP } from '../data'
import { PathwayView } from '../components/PathwayView'
import { useRoute } from '../store/router'
import { EvidenceBadge } from '../components/ui/Evidence'

type Tab = 'apoptosis-intrinsic' | 'apoptosis-extrinsic' | 'compare'

const ROWS: [string, string, string][] = [
  ['Trigger', 'Internal stress: DNA damage, growth-factor withdrawal, ER stress, oncogene activation', 'External death ligands (FasL, TRAIL, TNF) on immune cells'],
  ['Sensor / receptor', 'BH3-only proteins (PUMA, NOXA, BIM, BID)', 'Death receptors (Fas/CD95, DR4/DR5, TNFR1)'],
  ['Commitment step', 'MOMP by BAX/BAK', 'DISC assembly (FADD + procaspase-8)'],
  ['Initiator caspase', 'Caspase-9 (on the apoptosome)', 'Caspase-8 (and -10)'],
  ['Platform', 'Apoptosome: APAF-1 + cytochrome c + dATP', 'DISC'],
  ['Key inhibitors', 'BCL-2, BCL-xL, MCL-1; XIAP', 'c-FLIP; decoy receptors'],
  ['Crosstalk', 'Receives tBID from the extrinsic pathway', 'Caspase-8 cleaves BID → engages mitochondria (type II cells)'],
  ['Executioners', 'Caspase-3/7', 'Caspase-3/7'],
  ['Drug example', 'Venetoclax (BCL-2 inhibitor)', 'TRAIL-receptor agonists (investigational)'],
]

export function Apoptosis() {
  const { params } = useRoute()
  const initial = (params.get('pathway') as Tab) ?? 'apoptosis-intrinsic'
  const [tab, setTab] = useState<Tab>(PATHWAY_MAP[initial] || initial === 'compare' ? initial : 'apoptosis-intrinsic')
  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="glass pointer-events-auto absolute top-3 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-xl p-1">
        {(
          [
            ['apoptosis-intrinsic', 'Intrinsic'],
            ['apoptosis-extrinsic', 'Extrinsic'],
            ['compare', 'Compare'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-4 py-1.5 text-[13px] ${tab === id ? 'bg-cyan-400/20 text-cyan-100' : 'text-slate-300 hover:bg-white/5'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab !== 'compare' ? (
        <PathwayView pathway={PATHWAY_MAP[tab]} preselect={params.get('select')} />
      ) : (
        <div className="flex h-full flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
            {(['apoptosis-intrinsic', 'apoptosis-extrinsic'] as const).map((id) => (
              <div key={id} className="relative min-h-[320px] border-white/10 md:border-r">
                <div className="pointer-events-none absolute top-14 left-3 z-10 text-sm font-semibold text-white">{PATHWAY_MAP[id].name.replace('Apoptosis — ', '')}</div>
                <PathwayView pathway={PATHWAY_MAP[id]} compact hideHeader />
              </div>
            ))}
          </div>
          <div className="glass-strong scroll-thin max-h-[38%] overflow-auto border-t border-white/10 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="section-title">Side-by-side comparison</span>
              <EvidenceBadge level="established" />
            </div>
            <table className="w-full text-left text-[12px]">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 pr-3 font-medium"></th>
                  <th className="py-1 pr-3 font-medium text-violet-200">Intrinsic (mitochondrial)</th>
                  <th className="py-1 font-medium text-cyan-200">Extrinsic (death receptor)</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([k, a, b]) => (
                  <tr key={k} className="border-t border-white/5 align-top">
                    <td className="py-1.5 pr-3 font-medium whitespace-nowrap text-slate-300">{k}</td>
                    <td className="py-1.5 pr-3 text-slate-300">{a}</td>
                    <td className="py-1.5 text-slate-300">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
