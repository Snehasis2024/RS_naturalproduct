import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { DomLabel } from '../components/three/Label3D'
import type { PdbModel } from '../engine/pdb'
import { inferBonds } from '../engine/pdb'
import { AtomsAndBonds, type Representation } from '../components/three/MoleculeModel'
import type { ProteinStructureInfo } from '../data/schema'

const CHAIN_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#e879f9']
const SS_COLOR = { helix: '#f43f5e', sheet: '#facc15', coil: '#94a3b8' }
const NUCLEIC = new Set(['DA', 'DT', 'DG', 'DC', 'A', 'U', 'G', 'C', 'DU'])

/** Renders a parsed PDB entry: cartoon trace, atoms, surface, ligands, highlighted sites. */
export function ProteinScene({
  model,
  info,
  rep,
  showLigands,
  showSites,
  showWater,
  showAtomsOverlay,
  labels,
  onPick,
}: {
  model: PdbModel
  info?: ProteinStructureInfo
  rep: Representation
  showLigands: boolean
  showSites: boolean
  showWater: boolean
  showAtomsOverlay: boolean
  labels: boolean
  onPick?: (label: string, detail: string) => void
}) {
  const center = useMemo(() => {
    const poly = model.atoms.filter((a) => !a.het)
    const src = poly.length ? poly : model.atoms
    const c = new THREE.Vector3()
    src.forEach((a) => c.add(new THREE.Vector3(a.x, a.y, a.z)))
    return c.divideScalar(src.length || 1)
  }, [model])

  const chains = useMemo(() => [...new Set(model.atoms.filter((a) => !a.het).map((a) => a.chain))], [model])
  const poly = useMemo(() => model.atoms.filter((a) => !a.het), [model])
  const ligands = useMemo(() => model.atoms.filter((a) => a.het && a.resn !== 'HOH'), [model])
  const water = useMemo(() => model.atoms.filter((a) => a.resn === 'HOH' && a.el === 'O'), [model])

  // cartoon: CA (protein) or P (nucleic acid) trace per chain, split by secondary structure
  const cartoon = useMemo(() => {
    const ss = (chain: string, resi: number) =>
      model.helices.some((h) => h.chain === chain && resi >= h.start && resi <= h.end) ? 'helix' : model.sheets.some((s) => s.chain === chain && resi >= s.start && resi <= s.end) ? 'sheet' : 'coil'
    const out: { geo: THREE.TubeGeometry; color: string }[] = []
    for (const ch of chains) {
      const trace = poly.filter((a) => a.chain === ch && (a.name === 'CA' || (NUCLEIC.has(a.resn) && a.name === 'P')))
      if (trace.length < 3) continue
      const nucleic = NUCLEIC.has(trace[0].resn)
      // break the chain at gaps
      const segments: typeof trace[] = [[]]
      trace.forEach((a, i) => {
        const prev = trace[i - 1]
        if (prev && Math.hypot(a.x - prev.x, a.y - prev.y, a.z - prev.z) > (nucleic ? 8 : 4.3)) segments.push([])
        segments[segments.length - 1].push(a)
      })
      for (const seg of segments) {
        if (seg.length < 2) continue
        const pts = seg.map((a) => new THREE.Vector3(a.x - center.x, a.y - center.y, a.z - center.z))
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
        // colour runs of identical SS separately
        let start = 0
        for (let i = 1; i <= seg.length; i++) {
          const kind = nucleic ? 'coil' : ss(ch, seg[start].resi)
          const k2 = i < seg.length ? (nucleic ? 'coil' : ss(ch, seg[i].resi)) : null
          if (k2 !== kind) {
            const t0 = start / (seg.length - 1)
            const t1 = Math.min(1, i / (seg.length - 1))
            if (t1 > t0) {
              const sub = new THREE.CatmullRomCurve3(Array.from({ length: Math.max(2, (i - start) * 4) }, (_, k) => curve.getPoint(t0 + ((t1 - t0) * k) / Math.max(1, (i - start) * 4 - 1))))
              const r = nucleic ? 0.55 : kind === 'helix' ? 0.55 : kind === 'sheet' ? 0.45 : 0.22
              out.push({ geo: new THREE.TubeGeometry(sub, Math.max(4, (i - start) * 6), r, 8, false), color: nucleic ? '#fb923c' : SS_COLOR[kind as keyof typeof SS_COLOR] })
            }
            start = i
          }
        }
      }
    }
    return out
  }, [model, chains, poly, center])

  const polyAtoms = useMemo(() => poly.filter((a) => a.el !== 'H').map((a) => ({ el: a.el, x: a.x - center.x, y: a.y - center.y, z: a.z - center.z })), [poly, center])
  const polyBonds = useMemo(() => (rep === 'ball-stick' || rep === 'stick' || showAtomsOverlay ? inferBonds(polyAtoms) : []), [polyAtoms, rep, showAtomsOverlay])
  const ligAtoms = useMemo(() => ligands.map((a) => ({ el: a.el, x: a.x - center.x, y: a.y - center.y, z: a.z - center.z })), [ligands, center])
  const ligBonds = useMemo(() => inferBonds(ligAtoms, 1.95), [ligAtoms])

  const sites = useMemo(() => {
    if (!info?.sites) return []
    return info.sites
      .map((s) => {
        const atoms = poly.filter((a) => a.resi === s.resi && (!s.chain || a.chain === s.chain) && a.el !== 'H')
        if (!atoms.length) return null
        const local = atoms.map((a) => ({ el: a.el, x: a.x - center.x, y: a.y - center.y, z: a.z - center.z }))
        const ca = local[atoms.findIndex((a) => a.name === 'CA')] ?? local[0]
        return { ...s, atoms: local, bonds: inferBonds(local), anchor: ca, resn: atoms[0].resn }
      })
      .filter(Boolean) as { resi: number; label: string; resn: string; atoms: { el: string; x: number; y: number; z: number }[]; bonds: [number, number][]; anchor: { x: number; y: number; z: number } }[]
  }, [info, poly, center])

  const ligandGroups = useMemo(() => {
    const names = [...new Set(ligands.map((a) => a.resn))]
    return names.map((n) => {
      const atoms = ligands.filter((a) => a.resn === n)
      const c = atoms.reduce((v, a) => v.add(new THREE.Vector3(a.x, a.y, a.z)), new THREE.Vector3()).divideScalar(atoms.length).sub(center)
      return { resn: n, anchor: c, label: info?.ligands?.find((l) => l.resn === n)?.label }
    })
  }, [ligands, center, info])

  const pick = (label: string, detail: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onPick?.(label, detail)
  }

  const chainColor = (ch: string) => CHAIN_COLORS[chains.indexOf(ch) % CHAIN_COLORS.length]
  const byChain = useMemo(() => chains.map((ch) => ({ ch, atoms: poly.filter((a) => a.chain === ch && a.el !== 'H').map((a) => ({ el: a.el, x: a.x - center.x, y: a.y - center.y, z: a.z - center.z })) })), [chains, poly, center])

  return (
    <group>
      {rep === 'cartoon' &&
        cartoon.map((c, i) => (
          <mesh key={i} geometry={c.geo} onClick={pick('Backbone', 'Cartoon trace through Cα atoms (protein) or phosphorus atoms (nucleic acid). Red = α-helix, yellow = β-strand, grey = coil/loop (from the entry’s HELIX/SHEET records).')}>
            <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.15} roughness={0.4} />
          </mesh>
        ))}
      {(rep === 'ball-stick' || rep === 'stick' || rep === 'spacefill' || (rep === 'cartoon' && showAtomsOverlay)) && (
        <AtomsAndBonds atoms={polyAtoms} bonds={polyBonds} rep={rep === 'cartoon' ? 'stick' : rep} opacity={rep === 'cartoon' ? 0.35 : 1} />
      )}
      {rep === 'surface' &&
        byChain.map(({ ch, atoms }) => (
          <group key={ch} onClick={pick(`Chain ${ch}`, 'Approximate molecular envelope: each atom drawn as a sphere of its van der Waals radius inflated by ~1.1 Å. This approximates, but is not, a computed solvent-accessible surface.')}>
            <AtomsAndBonds atoms={atoms} bonds={[]} rep="surface" uniformColor={chainColor(ch)} opacity={0.95} glow={0.08} />
          </group>
        ))}
      {showLigands && ligAtoms.length > 0 && (
        <group onClick={pick('Ligands / cofactors', ligandGroups.map((g) => `${g.resn}${g.label ? ` — ${g.label}` : ''}`).join('\n'))}>
          <AtomsAndBonds atoms={ligAtoms} bonds={ligBonds} rep="ball-stick" carbonColor="#4ade80" highlight />
        </group>
      )}
      {showWater && water.length > 0 && (
        <AtomsAndBonds atoms={water.map((a) => ({ el: 'O', x: a.x - center.x, y: a.y - center.y, z: a.z - center.z }))} bonds={[]} rep="stick" opacity={0.5} />
      )}
      {showSites &&
        sites.map((s) => (
          <group key={s.label} onClick={pick(`${s.resn}${s.resi}`, s.label)}>
            <AtomsAndBonds atoms={s.atoms} bonds={s.bonds} rep="ball-stick" carbonColor="#22d3ee" highlight />
            {labels && (
              <DomLabel position={[s.anchor.x, s.anchor.y + 1.2, s.anchor.z]} anchor="center" className="label-3d hot" text={`${s.resn}${s.resi}`} />
            )}
          </group>
        ))}
      {labels && showLigands &&
        ligandGroups.slice(0, 6).map((g) => (
          <DomLabel key={g.resn} position={[g.anchor.x, g.anchor.y + 1.6, g.anchor.z]} anchor="center" className="label-3d" style={{ borderColor: '#4ade80' }} text={g.label ?? g.resn} />
        ))}
    </group>
  )
}

/** Clearly-labelled procedural placeholder used when a structure cannot be downloaded. */
export function ProceduralProtein() {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 160; i++) {
      const t = i / 160
      const helix = Math.floor(i / 20) % 2 === 0
      const base = new THREE.Vector3(Math.sin(t * 9) * 6, Math.cos(t * 7) * 5, Math.sin(t * 5 + 1) * 5)
      if (helix) base.add(new THREE.Vector3(Math.cos(i * 1.7) * 1.2, Math.sin(i * 1.7) * 1.2, 0))
      pts.push(base)
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.35, 8, false)
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#94a3b8" emissive="#64748b" emissiveIntensity={0.2} wireframe={false} />
    </mesh>
  )
}
