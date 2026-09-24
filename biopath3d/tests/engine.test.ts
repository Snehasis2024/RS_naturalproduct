import { describe, expect, it } from 'vitest'
import { PATHWAYS, PATHWAY_MAP, ENTITY_MAP, MOLECULES } from '../src/data'
import { layoutPathway } from '../src/engine/layout'
import { normalizePathway } from '../src/engine/normalize'
import { reactionOrder, ledger } from '../src/engine/metabolism'
import { search } from '../src/engine/search'
import { answer, SUGGESTED_QUESTIONS } from '../src/engine/tutor'
import { allQuestions, buildQuiz } from '../src/engine/quizGen'
import { LESSONS } from '../src/data/lessons'
import { questionById } from '../src/engine/quizGen'
import { translate, toRNA, DEMO_GENE, GENETIC_CODE } from '../src/data/dogma'
import { parsePdb, inferBonds } from '../src/engine/pdb'
import { topicStats } from '../src/engine/progress'

describe('pathway content', () => {
  it('loads every JSON pathway and all edges resolve', () => {
    expect(PATHWAYS.length).toBeGreaterThanOrEqual(20)
    for (const p of PATHWAYS) {
      const ids = new Set(p.nodes.map((n) => n.id))
      for (const e of p.edges) {
        expect(ids.has(e.from), `${p.id}: ${e.from}`).toBe(true)
        expect(ids.has(e.to), `${p.id}: ${e.to}`).toBe(true)
      }
    }
  })
  it('node refs point at knowledge-base entities', () => {
    for (const p of PATHWAYS) for (const n of p.nodes) if (n.ref) expect(ENTITY_MAP[n.ref], `${p.id}:${n.id} → ${n.ref}`).toBeDefined()
  })
  it('node mol ids point at generated conformers', () => {
    const mols = new Set(MOLECULES.map((m) => m.id))
    for (const p of PATHWAYS) for (const n of p.nodes) if (n.mol) expect(mols.has(n.mol), n.mol).toBe(true)
  })
  it('includes every required pathway', () => {
    for (const id of ['egfr-mapk', 'pi3k-akt-mtor', 'jak-stat', 'wnt', 'tgfb', 'nfkb', 'notch', 'hedgehog', 'mapk-stress', 'apoptosis-intrinsic', 'apoptosis-extrinsic', 'dna-damage', 'cell-cycle-regulation', 'global-map', 'glycolysis', 'tca', 'oxphos', 'ppp', 'gluconeogenesis', 'beta-oxidation', 'fa-synthesis', 'urea-cycle', 'amino-acid'])
      expect(PATHWAY_MAP[id], id).toBeDefined()
  })
  it('layout gives every node a finite 3D position', () => {
    for (const p of PATHWAYS) {
      const pos = layoutPathway(p)
      for (const n of p.nodes) {
        expect(pos[n.id], `${p.id}:${n.id}`).toBeDefined()
        pos[n.id].forEach((v) => expect(Number.isFinite(v)).toBe(true))
      }
    }
  })
  it('normalises the compact steps/next authoring format', () => {
    const p = normalizePathway({ pathway: 'Test', steps: [{ name: 'A', type: 'ligand', next: 'B' }, { name: 'B', type: 'receptor' }] })
    expect(p.nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(p.edges).toEqual([{ from: 'a', to: 'b', type: 'activation' }])
    expect(() => normalizePathway({ pathway: 'Bad', steps: [{ name: 'A', type: 'ligand', next: 'missing' }] })).toThrow()
  })
})

describe('metabolic stoichiometry (energy ledger)', () => {
  const tot = (id: string) => ledger(reactionOrder(PATHWAY_MAP[id]), null)
  it('glycolysis: net +2 ATP, +2 NADH per glucose', () => {
    expect(tot('glycolysis').atp).toBe(2)
    expect(tot('glycolysis').nadh).toBe(2)
  })
  it('glycolysis investment phase costs 2 ATP', () => {
    expect(ledger(reactionOrder(PATHWAY_MAP['glycolysis']), 2).atp).toBe(-2)
  })
  it('TCA: 3 NADH, 1 FADH2, 1 GTP, 2 CO2 per acetyl-CoA', () => {
    expect(tot('tca')).toMatchObject({ nadh: 3, fadh2: 1, gtp: 1, co2: 2 })
  })
  it('β-oxidation of palmitoyl-CoA: 7 FADH2 + 7 NADH', () => {
    expect(tot('beta-oxidation')).toMatchObject({ fadh2: 7, nadh: 7 })
  })
  it('fatty acid synthesis: 7 ATP and 14 NADPH per palmitate', () => {
    expect(tot('fa-synthesis')).toMatchObject({ atp: -7, nadph: -14 })
  })
  it('gluconeogenesis: 4 ATP + 2 GTP + 2 NADH per glucose', () => {
    expect(tot('gluconeogenesis')).toMatchObject({ atp: -4, gtp: -2, nadh: -2 })
  })
  it('urea cycle: 4 high-energy phosphate bonds', () => {
    expect(tot('urea-cycle').atp).toBe(-4)
  })
  it('oxidative PPP: 2 NADPH + 1 CO2', () => {
    expect(tot('ppp')).toMatchObject({ nadph: 2, co2: 1 })
  })
  it('OXPHOS: 10 H+ pumped per NADH', () => {
    expect(tot('oxphos').hplus).toBe(10)
  })
})

describe('central dogma', () => {
  it('uses the standard genetic code', () => {
    expect(GENETIC_CODE.AUG).toBe('M')
    expect(GENETIC_CODE.UGG).toBe('W')
    expect(['UAA', 'UAG', 'UGA'].map((c) => GENETIC_CODE[c])).toEqual(['*', '*', '*'])
    expect(Object.keys(GENETIC_CODE)).toHaveLength(64)
  })
  it('splices and translates the demo gene', () => {
    expect(DEMO_GENE.intron.startsWith('GT') && DEMO_GENE.intron.endsWith('AG')).toBe(true)
    const pep = translate(toRNA(DEMO_GENE.exon1 + DEMO_GENE.exon2)).map((c) => c.aa).join('')
    expect(pep).toBe('MAKELFTG*')
  })
})

describe('search', () => {
  it.each([
    ['p53', 'p53'], ['glycolysis', 'Glycolysis'], ['mitosis', 'Mitosis'], ['CDK1', 'CDK1'], ['AKT', 'AKT (PKB)'], ['mTOR', 'mTORC1'], ['EGFR', 'EGFR'], ['apoptosis', 'Apoptosis'], ['mitochondria', 'Mitochondrion'],
  ])('finds %s', (q, title) => {
    const r = search(q)
    expect(r.slice(0, 3).map((x) => x.title)).toContain(title)
  })
})

describe('BioTutor (offline)', () => {
  it('answers the example questions at all three levels without falling back', () => {
    for (const q of SUGGESTED_QUESTIONS)
      for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
        const a = answer(q, level)
        expect(a.text, q).not.toMatch(/couldn’t match/)
        expect(a.text.length).toBeGreaterThan(60)
      }
  })
  it('uses the selected object for deictic questions', () => {
    const a = answer('What does this do?', 'beginner', { kind: 'organelle', id: 'mitochondria', label: 'Mitochondrion' })
    expect(a.usedContext).toBe(true)
    expect(a.text).toMatch(/Mitochondri/)
  })
  it('refuses to invent when nothing matches', () => {
    expect(answer('qwertyuiop zxcv', 'beginner').text).toMatch(/couldn’t match/)
  })
})

describe('quiz', () => {
  it('every question is well formed', () => {
    const ids = new Set<string>()
    for (const q of allQuestions()) {
      expect(ids.has(q.id), q.id).toBe(false)
      ids.add(q.id)
      if ('options' in q) {
        expect(q.answer).toBeGreaterThanOrEqual(0)
        expect(q.answer).toBeLessThan(q.options.length)
        expect(new Set(q.options).size, q.id).toBe(q.options.length)
      }
      if (q.type === 'order') expect(new Set(q.items).size, q.id).toBe(q.items.length)
      if (q.type === 'match') expect(new Set(q.pairs.map((p) => p[1])).size, q.id).toBe(q.pairs.length)
    }
  })
  it('generates questions of every type', () => {
    const types = new Set(allQuestions().map((q) => q.type))
    for (const t of ['mcq', 'mechanism', 'order', 'match', 'identify']) expect(types.has(t as never)).toBe(true)
  })
  it('lesson question references resolve', () => {
    for (const l of LESSONS) for (const s of l.steps) if (s.kind === 'question') expect(questionById(s.questionId), s.questionId).toBeDefined()
  })
  it('builds filtered quizzes', () => {
    const q = buildQuiz({ topic: 'metabolism', count: 5, seed: 1 })
    expect(q).toHaveLength(5)
    q.forEach((x) => expect(x.topic).toBe('metabolism'))
  })
})

describe('pdb parser', () => {
  const pdb = [
    'HELIX    1   1 ALA A    1  ALA A    3  1                                   3',
    'ATOM      1  N   ALA A   1      11.104   6.134  -6.504  1.00  0.00           N',
    'ATOM      2  CA  ALA A   1      11.639   6.071  -5.147  1.00  0.00           C',
    'ATOM      3  C   ALA A   1      13.140   6.206  -5.169  1.00  0.00           C',
    'HETATM    4 ZN    ZN A 900       0.000   0.000   0.000  1.00  0.00          ZN',
  ].join('\n')
  it('parses atoms, elements, hetero groups and helices', () => {
    const m = parsePdb('TEST', pdb)
    expect(m.atoms).toHaveLength(4)
    expect(m.atoms[1]).toMatchObject({ name: 'CA', resn: 'ALA', chain: 'A', resi: 1, el: 'C', het: false })
    expect(m.atoms[3]).toMatchObject({ el: 'Zn', het: true })
    expect(m.helices).toEqual([{ chain: 'A', start: 1, end: 3 }])
    expect(inferBonds(m.atoms.slice(0, 3))).toEqual([[0, 1], [1, 2]])
  })
})

describe('progress', () => {
  it('computes mastery from lessons and quiz accuracy', () => {
    const cell = LESSONS.filter((l) => l.topic === 'cell-biology')
    const done = Object.fromEntries(cell.map((l) => [l.id, 1]))
    const attempts = Array.from({ length: 10 }, (_, i) => ({ qid: `q${i}`, topic: 'cell-biology' as const, correct: true, ts: i }))
    const s = topicStats(done, attempts).find((x) => x.topic === 'cell-biology')!
    expect(s.mastery).toBe(100)
  })
})
