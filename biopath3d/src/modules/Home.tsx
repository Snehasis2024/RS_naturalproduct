import { SceneShell } from '../components/three/SceneShell'
import { CellModel } from '../components/three/cell/CellModel'
import { navigate } from '../store/router'
import { JOURNEY, LESSONS } from '../data/lessons'
import { useStore } from '../store/useStore'
import { EvidenceLegend } from '../components/ui/Evidence'

const MODULES = [
  { icon: '🧫', title: 'Cell Explorer', text: 'Rotate, isolate and explode a 3D animal cell.', path: '/cell' },
  { icon: '🔄', title: 'Cell Cycle', text: 'Watch chromosomes condense, align and separate.', path: '/cellcycle' },
  { icon: '🧬', title: 'DNA → RNA → Protein', text: 'Transcription and translation, codon by codon.', path: '/dogma' },
  { icon: '📡', title: 'Signaling Lab', text: 'EGFR, PI3K–AKT–mTOR, WNT, NF-κB and more.', path: '/signaling' },
  { icon: '⚡', title: 'Metabolism', text: 'Glycolysis to the urea cycle with an ATP ledger.', path: '/metabolism' },
  { icon: '💀', title: 'Apoptosis', text: 'Compare intrinsic and extrinsic pathways.', path: '/apoptosis' },
  { icon: '🕸️', title: 'Pathway Map', text: 'See how signalling, the cycle and death connect.', path: '/map' },
  { icon: '🔬', title: 'Molecular Viewer', text: 'Real PDB structures and computed conformers.', path: '/molecules' },
]

export function Home() {
  const done = useStore((s) => s.lessonsCompleted)
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <section className="relative h-[78vh] min-h-[520px] w-full">
        <SceneShell camera={[5.5, 2.5, 12]} autoRotate target={[-1.5, 0, 0]} maxDistance={30}>
          <group position={[1.5, 0, 0]}>
            <CellModel labels={false} interactive={false} />
          </group>
        </SceneShell>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050a18] via-[#050a18]/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050a18] to-transparent" />
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <div className="pointer-events-auto max-w-xl px-6 sm:px-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium tracking-wider text-cyan-200 uppercase">
              Interactive 3D biology · university level
            </div>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl">
              Explore Biology.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 bg-clip-text text-transparent">Don’t Just Read It.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-slate-300 sm:text-lg">
              Travel from the cell cycle to molecular pathways through an interactive 3D biological universe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn btn-primary px-5 py-3 text-sm tracking-wide" onClick={() => navigate('/cell')}>
                ENTER 3D CELL
              </button>
              <button className="btn px-5 py-3 text-sm tracking-wide" onClick={() => navigate('/learn')}>
                START LEARNING
              </button>
              <button className="btn px-5 py-3 text-sm tracking-wide" onClick={() => navigate('/universe')}>
                🌌 Zoom the universe
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-8">
        <h2 className="section-title mb-3">Guided learning journey</h2>
        <div className="scroll-thin flex gap-2 overflow-x-auto pb-2">
          {JOURNEY.map((j, i) => {
            const lesson = LESSONS.find((l) => l.journey === j)
            const complete = lesson && done[lesson.id]
            return (
              <div key={j} className="flex items-center gap-2">
                <button
                  className={`glass min-w-36 rounded-xl px-4 py-3 text-left transition hover:border-cyan-400/50 ${complete ? 'border-emerald-400/40' : ''}`}
                  onClick={() => navigate(lesson ? `/learn?lesson=${lesson.id}` : '/learn')}
                >
                  <div className="font-mono text-[10px] text-cyan-300">STAGE {i + 1}</div>
                  <div className="text-sm font-semibold text-white">{j}</div>
                  <div className="text-[11px] text-slate-400">{complete ? '✓ completed' : lesson ? `${lesson.minutes} min` : ''}</div>
                </button>
                {i < JOURNEY.length - 1 && <span className="text-cyan-400/60">→</span>}
              </div>
            )
          })}
        </div>

        <h2 className="section-title mt-10 mb-3">Laboratories</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <button key={m.path} onClick={() => navigate(m.path)} className="glass group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/50">
              <div className="text-2xl">{m.icon}</div>
              <div className="mt-2 font-semibold text-white">{m.title}</div>
              <div className="mt-1 text-[13px] text-slate-400">{m.text}</div>
            </button>
          ))}
        </div>

        <div className="glass mt-10 rounded-2xl p-5">
          <h2 className="section-title mb-2">Scientific honesty</h2>
          <p className="mb-3 text-sm text-slate-300">
            Every view is labelled so you know what you are looking at. Protein structures are loaded live from the RCSB Protein Data Bank; small molecules are computed 3D conformers from SMILES (RDKit); organelles and pathway networks are procedural teaching models. References link to UniProt, PDB, KEGG, Reactome, ChEBI, Gene Ontology and textbooks on NCBI Bookshelf.
          </p>
          <EvidenceLegend />
        </div>
      </section>
    </div>
  )
}
