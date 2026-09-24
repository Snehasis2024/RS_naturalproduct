import { useEffect, useMemo, useState } from 'react'
import { SceneShell } from '../components/three/SceneShell'
import { FitCamera } from '../components/three/FitCamera'
import { SmallMoleculeModel, type Representation } from '../components/three/MoleculeModel'
import { ProteinScene, ProceduralProtein } from '../scenes/ProteinScene'
import { STRUCTURES } from '../data/structures'
import { ENTITIES, MOLECULE_MAP, MOLECULES } from '../data'
import { fetchPdb, type PdbModel } from '../engine/pdb'
import { useStore } from '../store/useStore'
import { useRoute, navigate } from '../store/router'
import { ControlBar } from '../components/ui/ControlBar'
import { EvidenceBadge } from '../components/ui/Evidence'

const REPS: { id: Representation; label: string }[] = [
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'surface', label: 'Surface' },
  { id: 'ball-stick', label: 'Ball-and-stick' },
  { id: 'spacefill', label: 'Space filling' },
  { id: 'stick', label: 'Sticks' },
]

/** Reusable viewer body: pass a PDB id or a small-molecule id. */
export function MoleculeStage({ id, compact }: { id: string; compact?: boolean }) {
  const isPdb = /^[0-9][A-Za-z0-9]{3}$/.test(id)
  const info = STRUCTURES.find((s) => s.pdb === id.toUpperCase())
  const mol = MOLECULE_MAP[id]
  const select = useStore((s) => s.select)
  const showLabels = useStore((s) => s.showLabels)
  const [rep, setRep] = useState<Representation>(isPdb ? 'cartoon' : 'ball-stick')
  const [showH, setShowH] = useState(true)
  const [ligands, setLigands] = useState(true)
  const [sites, setSites] = useState(true)
  const [water, setWater] = useState(false)
  const [atoms, setAtoms] = useState(false)
  const [model, setModel] = useState<PdbModel | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setRep(isPdb ? 'cartoon' : 'ball-stick')
    setModel(null)
    setErr(null)
    if (!isPdb) return
    let alive = true
    fetchPdb(id)
      .then((m) => alive && setModel(m))
      .catch((e) => alive && setErr((e as Error).message))
    return () => {
      alive = false
    }
  }, [id, isPdb])

  const radius = useMemo(() => {
    if (mol) return Math.max(...mol.atoms.map((a) => Math.hypot(a[1], a[2], a[3]))) + 1.5
    if (model) {
      const pts = model.atoms.filter((a) => !a.het)
      const c = pts.reduce((s, a) => [s[0] + a.x, s[1] + a.y, s[2] + a.z], [0, 0, 0]).map((v) => v / pts.length)
      return Math.max(...pts.map((a) => Math.hypot(a.x - c[0], a.y - c[1], a.z - c[2])))
    }
    return 14
  }, [mol, model])

  const source = isPdb ? (err ? 'hypothetical' : 'established') : 'established'

  return (
    <div className="relative h-full w-full">
      <SceneShell camera={[0, 0, 30]} dust={!compact} maxDistance={400} fog={false}>
        <FitCamera radius={radius} deps={[id]} />
        {mol && <SmallMoleculeModel mol={mol} rep={rep === 'cartoon' ? 'ball-stick' : rep} showH={showH} />}
        {isPdb && model && (
          <ProteinScene
            model={model}
            info={info}
            rep={rep}
            showLigands={ligands}
            showSites={sites}
            showWater={water}
            showAtomsOverlay={atoms}
            labels={showLabels}
            onPick={(label, detail) => select({ kind: 'structure', id: `${id}:${label}`, label: `${label} · PDB ${id.toUpperCase()}`, detail: { description: detail, evidence: 'established' } })}
          />
        )}
        {isPdb && err && <ProceduralProtein />}
      </SceneShell>

      <div className="glass pointer-events-auto absolute top-3 right-3 z-10 w-[min(340px,calc(100%-1.5rem))] rounded-2xl p-3">
        {isPdb ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip font-mono">PDB {id.toUpperCase()}</span>
              {err ? <EvidenceBadge level="hypothetical" /> : <span className="chip border-emerald-400/40 text-emerald-200">Experimental structure</span>}
            </div>
            <h2 className="mt-1 text-base font-semibold text-white">{info?.title ?? model?.title ?? id}</h2>
            {!model && !err && <p className="mt-1 text-[12px] text-cyan-200">Downloading from RCSB PDB…</p>}
            {err && (
              <p className="mt-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 p-2 text-[11.5px] text-fuchsia-100">
                Could not load the structure ({err}). Showing a PROCEDURAL PLACEHOLDER — this is not an experimental structure.
              </p>
            )}
            {info && !compact && (
              <div className="mt-2 space-y-1.5 text-[12px] text-slate-300">
                <p>{info.description}</p>
                <p><span className="section-title">Function </span>{info.function}</p>
                {info.method && <p className="text-[11px] text-slate-400">{info.method}</p>}
              </div>
            )}
            {model && <p className="mt-1 text-[11px] text-slate-400">{model.atoms.length.toLocaleString()} atoms · chains {[...new Set(model.atoms.map((a) => a.chain))].join(', ')}</p>}
            <a className="mt-1 inline-block text-[11px] text-cyan-300 hover:underline" href={`https://www.rcsb.org/structure/${id.toUpperCase()}`} target="_blank" rel="noreferrer">
              Open on RCSB PDB ↗
            </a>
          </>
        ) : mol ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip font-mono">{mol.formula}</span>
              <span className="chip">{mol.mw} g/mol</span>
              <EvidenceBadge level={source} />
            </div>
            <h2 className="mt-1 text-base font-semibold text-white">{mol.name}</h2>
            <p className="mt-1 text-[11.5px] text-slate-400">
              Computed 3D conformer (RDKit ETKDG + MMFF94) from SMILES, drawn as the neutral species. Geometry is realistic but not an experimentally determined structure.
            </p>
            <p className="mt-1 font-mono text-[10.5px] break-all text-slate-500">{mol.smiles}</p>
            <a className="mt-1 inline-block text-[11px] text-cyan-300 hover:underline" href={`https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${mol.chebi}`} target="_blank" rel="noreferrer">
              {mol.chebi} ↗
            </a>
            {(() => {
              const e = ENTITIES.find((x) => x.mol === mol.id)
              return e ? <p className="mt-1 text-[12px] text-slate-300">Related: <button className="text-cyan-300 hover:underline" onClick={() => select({ kind: 'protein', id: e.id, label: e.name })}>{e.name}</button></p> : null
            })()}
          </>
        ) : (
          <p className="text-sm text-slate-300">Unknown entry “{id}”.</p>
        )}
      </div>

      <ControlBar>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="section-title mr-1">Representation</span>
          {REPS.map((r) => (
            <button key={r.id} disabled={!isPdb && r.id === 'cartoon'} className={`btn ${rep === r.id ? 'btn-active' : ''}`} onClick={() => setRep(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="section-title mr-1">Show</span>
          {isPdb ? (
            <>
              <button className={`btn ${atoms ? 'btn-active' : ''}`} onClick={() => setAtoms(!atoms)} disabled={rep !== 'cartoon'}>Atoms</button>
              <button className={`btn ${ligands ? 'btn-active' : ''}`} onClick={() => setLigands(!ligands)}>Ligands</button>
              <button className={`btn ${sites ? 'btn-active' : ''}`} onClick={() => setSites(!sites)} disabled={!info?.sites}>Active / key sites</button>
              <button className={`btn ${water ? 'btn-active' : ''}`} onClick={() => setWater(!water)}>Water</button>
            </>
          ) : (
            <button className={`btn ${showH ? 'btn-active' : ''}`} onClick={() => setShowH(!showH)}>Hydrogens</button>
          )}
          {!compact && <span className="ml-auto text-[10.5px] text-slate-500">Colours: C grey · N blue · O red · P orange · S yellow · ligand C green · highlighted residue C cyan</span>}
        </div>
      </ControlBar>
    </div>
  )
}

export function MolecularViewer() {
  const { params } = useRoute()
  const id = params.get('id') ?? '1TUP'
  const [open, setOpen] = useState(typeof window !== 'undefined' && window.innerWidth > 1100)
  return (
    <div className="relative h-full w-full">
      <MoleculeStage id={id} />
      <div className="glass pointer-events-auto absolute top-3 left-3 z-10 w-56 rounded-2xl p-2">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="section-title">Library</span>
          <button className="text-[11px] text-cyan-300" onClick={() => setOpen(!open)}>{open ? 'hide' : 'show'}</button>
        </div>
        {open && (
          <div className="scroll-thin max-h-[55vh] overflow-y-auto">
            <div className="px-1 pt-1 text-[10px] tracking-wider text-emerald-300 uppercase">Experimental (PDB)</div>
            {STRUCTURES.map((s) => (
              <button key={s.pdb} onClick={() => navigate(`/molecules?id=${s.pdb}`)} className={`block w-full rounded-md px-2 py-1 text-left text-[12px] ${id.toUpperCase() === s.pdb ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5'}`}>
                <span className="font-mono text-[10px] text-slate-500">{s.pdb}</span> {s.title}
              </button>
            ))}
            <div className="px-1 pt-2 text-[10px] tracking-wider text-amber-300 uppercase">Computed conformers</div>
            {MOLECULES.map((m) => (
              <button key={m.id} onClick={() => navigate(`/molecules?id=${m.id}`)} className={`block w-full rounded-md px-2 py-1 text-left text-[12px] ${id === m.id ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5'}`}>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
