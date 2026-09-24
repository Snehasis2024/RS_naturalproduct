import { ENTITIES, PATHWAYS } from '../data'
import { LESSONS } from '../data/lessons'
import { CELL_CYCLE_PHASES } from '../data/cellCycle'
import { DOGMA_STAGES } from '../data/dogma'
import { MOLECULES } from '../data'
import { STRUCTURES } from '../data/structures'

export type ResultKind = 'Organelle' | 'Protein' | 'Gene' | 'Molecule' | 'Pathway' | 'Cell process' | 'Lesson' | 'Structure'

export interface SearchResult {
  key: string
  kind: ResultKind
  title: string
  subtitle: string
  /** Hash route to open. */
  route: string
  /** Entity to select once the route opens. */
  select?: string
  terms: string[]
  /** Secondary terms (e.g. pathway members) that count for less. */
  weak?: string[]
}

let INDEX: SearchResult[] | null = null

function build(): SearchResult[] {
  const out: SearchResult[] = []
  for (const e of ENTITIES) {
    const kind: ResultKind = e.kind === 'organelle' ? 'Organelle' : e.kind === 'molecule' ? 'Molecule' : 'Protein'
    const route = e.kind === 'organelle' ? `/cell?select=${e.id}` : e.relatedPathways?.[0] ? routeForPathway(e.relatedPathways[0], e.id) : `/tutor?about=${e.id}`
    out.push({ key: `e:${e.id}`, kind, title: e.name, subtitle: e.summary, route, select: e.id, terms: [e.name, e.id, ...(e.aliases ?? [])] })
    if (e.gene) out.push({ key: `g:${e.id}`, kind: 'Gene', title: e.gene, subtitle: `Human gene encoding ${e.name}`, route, select: e.id, terms: [e.gene] })
  }
  for (const p of PATHWAYS) {
    out.push({ key: `p:${p.id}`, kind: 'Pathway', title: p.name, subtitle: p.summary, route: routeForPathway(p.id), terms: [p.name, p.id], weak: p.nodes.map((n) => n.label) })
  }
  for (const ph of CELL_CYCLE_PHASES) {
    out.push({ key: `c:${ph.id}`, kind: 'Cell process', title: ph.name, subtitle: ph.summary, route: `/cellcycle?phase=${ph.id}`, terms: [ph.name, ph.id, ph.short], weak: [ph.group === 'mitosis' ? 'mitosis' : ph.group, 'cell cycle'] })
  }
  for (const s of DOGMA_STAGES) {
    out.push({ key: `d:${s.id}`, kind: 'Cell process', title: s.name, subtitle: s.summary, route: `/dogma?stage=${s.id}`, terms: [s.name, s.id, 'central dogma', 'gene expression'] })
  }
  out.push({ key: 'c:apoptosis', kind: 'Cell process', title: 'Apoptosis', subtitle: 'Programmed cell death via intrinsic and extrinsic caspase pathways.', route: '/apoptosis', terms: ['apoptosis', 'programmed cell death', 'caspase', 'necrosis'] })
  out.push({ key: 'c:mitosis', kind: 'Cell process', title: 'Mitosis', subtitle: 'Nuclear division: prophase, prometaphase, metaphase, anaphase, telophase (+ cytokinesis).', route: '/cellcycle?phase=prophase', terms: ['mitosis', 'M phase', 'cell division'] })
  for (const m of MOLECULES) {
    out.push({ key: `m:${m.id}`, kind: 'Molecule', title: m.name, subtitle: `${m.formula} · ${m.mw} g/mol · computed 3D conformer`, route: `/molecules?id=${m.id}`, terms: [m.name, m.id, m.formula] })
  }
  for (const s of STRUCTURES) {
    out.push({ key: `s:${s.pdb}`, kind: 'Structure', title: `${s.title} (PDB ${s.pdb})`, subtitle: s.description, route: `/molecules?id=${s.pdb}`, terms: [s.title, s.pdb] })
  }
  for (const l of LESSONS) {
    out.push({ key: `l:${l.id}`, kind: 'Lesson', title: l.title, subtitle: `${l.journey} · ${l.minutes} min`, route: `/learn?lesson=${l.id}`, terms: [l.title, ...l.tags, l.journey] })
  }
  return out
}

export function routeForPathway(id: string, select?: string) {
  const p = PATHWAYS.find((x) => x.id === id)
  const sel = select ? `&select=${select}` : ''
  if (!p) return `/signaling?pathway=${id}${sel}`
  switch (p.category) {
    case 'metabolic':
      return `/metabolism?pathway=${id}${sel}`
    case 'apoptosis':
      return `/apoptosis?pathway=${id}${sel}`
    case 'regulation':
      return `/regulation?pathway=${id}${sel}`
    case 'map':
      return `/map${select ? `?select=${select}` : ''}`
    default:
      return `/signaling?pathway=${id}${sel}`
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/β/g, 'beta')
    .replace(/α/g, 'alpha')
    .replace(/κ/g, 'k')
    .replace(/γ/g, 'gamma')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export function score(query: string, r: SearchResult): number {
  const q = norm(query)
  if (!q) return 0
  let best = 0
  for (const t of r.terms) {
    const n = norm(t)
    if (!n) continue
    if (n === q) best = Math.max(best, 100)
    else if (n.startsWith(q)) best = Math.max(best, 70 - Math.min(20, n.length - q.length))
    else if (n.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 50)
    else if (n.includes(q)) best = Math.max(best, 30)
  }
  for (const t of r.weak ?? []) {
    const n = norm(t)
    if (n === q || n.startsWith(q)) best = Math.max(best, 40)
    else if (q.length > 2 && n.includes(q)) best = Math.max(best, 20)
  }
  if (!best && q.length > 3 && norm(r.subtitle).includes(q)) best = 10
  // prefer primary objects over lessons/genes when tied
  const bias: Record<ResultKind, number> = { Organelle: 4, Protein: 3, Pathway: 3, 'Cell process': 3, Molecule: 2, Structure: 2, Gene: 1, Lesson: 0 }
  return best ? best + bias[r.kind] : 0
}

export function search(query: string, limit = 24): SearchResult[] {
  INDEX ??= build()
  return INDEX.map((r) => [score(query, r), r] as const)
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, r]) => r)
}
