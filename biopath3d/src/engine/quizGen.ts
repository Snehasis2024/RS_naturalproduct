import type { Pathway, Question, Topic } from '../data/schema'
import { PATHWAYS, ENTITY_MAP } from '../data'
import { ORGANELLES } from '../data/organelles'
import { QUESTIONS } from '../data/questions'

/** Seeded PRNG so a generated quiz is reproducible within a session. */
export function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
export function shuffle<T>(a: T[], r: () => number): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function topicOf(p: Pathway): Topic {
  return p.topic ?? (p.category === 'metabolic' ? 'metabolism' : 'signaling')
}

/** Longest simple chain of main (non-optional, non-inhibitory) edges, for ordering questions. */
function mainChain(p: Pathway): string[] {
  const edges = p.edges.filter((e) => !e.optional && e.type !== 'inhibition' && e.type !== 'crosstalk')
  const adj = new Map<string, string[]>()
  for (const e of edges) adj.set(e.from, [...(adj.get(e.from) ?? []), e.to])
  let best: string[] = []
  const walk = (u: string, path: string[]) => {
    if (path.length > best.length) best = path
    for (const v of adj.get(u) ?? []) if (!path.includes(v)) walk(v, [...path, v])
  }
  for (const n of p.nodes) walk(n.id, [n.id])
  return best
}

/** Questions generated from pathway and organelle data: new JSON automatically produces new questions. */
export function generatedQuestions(): Question[] {
  const out: Question[] = []
  const r = rng(7)
  for (const p of PATHWAYS) {
    if (p.category === 'map') continue
    const label = (id: string) => p.nodes.find((n) => n.id === id)!.label
    const chain = mainChain(p)
    if (chain.length >= 4) {
      const items = chain.slice(0, 7).map(label)
      if (new Set(items).size === items.length)
        out.push({ id: `gen-order-${p.id}`, type: 'order', topic: topicOf(p), tags: [p.id], prompt: `Order these steps of ${p.name}.`, items, explanation: `${p.name}: ${items.join(' → ')}. ${p.summary}` })
    }
    // "What comes next" questions from activating edges
    const nexts = p.edges.filter((e) => !e.optional && e.type !== 'inhibition' && label(e.from) !== label(e.to))
    for (const e of shuffle(nexts, r).slice(0, 2)) {
      const correct = label(e.to)
      const distractors = shuffle(p.nodes.map((n) => n.label).filter((l) => l !== correct && l !== label(e.from)), r).slice(0, 3)
      if (distractors.length < 3) continue
      const options = shuffle([correct, ...distractors], r)
      const enz = e.enzyme ? ` (catalysed by ${e.enzyme.name}${e.enzyme.ec ? `, EC ${e.enzyme.ec}` : ''})` : ''
      out.push({ id: `gen-next-${p.id}-${e.from}-${e.to}`, type: 'mcq', topic: topicOf(p), tags: [p.id, ...(p.nodes.find((n) => n.id === e.to)?.ref ? [p.nodes.find((n) => n.id === e.to)!.ref!] : [])], prompt: `In ${p.name}, what comes directly after “${label(e.from)}”?`, options, answer: options.indexOf(correct), explanation: `${label(e.from)} → ${correct}${e.label ? ` (${e.label})` : ''}${enz}.` })
    }
    // Enzyme questions (metabolic)
    const enzymeEdges = p.edges.filter((e) => e.enzyme && !e.optional)
    const enzymeNames = [...new Set(p.edges.filter((e) => e.enzyme).map((e) => e.enzyme!.name))]
    for (const e of shuffle(enzymeEdges, r).slice(0, 2)) {
      const correct = e.enzyme!.name
      const distractors = shuffle(enzymeNames.filter((n) => n !== correct), r).slice(0, 3)
      if (distractors.length < 3) continue
      const options = shuffle([correct, ...distractors], r)
      out.push({ id: `gen-enz-${p.id}-${e.from}-${e.to}`, type: 'mcq', topic: 'metabolism', tags: [p.id], prompt: `Which enzyme converts ${label(e.from)} → ${label(e.to)}?`, options, answer: options.indexOf(correct), explanation: `${correct}${e.enzyme!.ec ? ` (EC ${e.enzyme!.ec})` : ''}. ${e.description ?? ''}`.trim() })
    }
  }
  // Identify-the-organelle (image-based, rendered in 3D)
  const pickable = ['mitochondria', 'nucleus', 'golgi', 'er', 'lysosomes', 'peroxisomes', 'centrosome', 'nucleolus', 'ribosomes']
  for (const id of pickable) {
    if (QUESTIONS.some((q) => q.type === 'identify' && q.organelle === id)) continue
    const o = ORGANELLES.find((x) => x.id === id)!
    const others = shuffle(ORGANELLES.filter((x) => x.id !== id && pickable.includes(x.id)), r).slice(0, 3).map((x) => x.name)
    const options = shuffle([o.name, ...others], r)
    out.push({ id: `gen-id-${id}`, type: 'identify', topic: 'cell-biology', tags: [id], organelle: id, prompt: 'Identify the highlighted organelle.', options, answer: options.indexOf(o.name), explanation: `${o.name}: ${o.summary}` })
  }
  // Match: organelle → key molecule
  const withMol = ORGANELLES.filter((o) => o.keyMolecules?.length && pickable.includes(o.id))
  const pick = shuffle(withMol, r).slice(0, 4)
  out.push({ id: 'gen-match-organelle-molecule', type: 'match', topic: 'cell-biology', tags: pick.map((o) => o.id), prompt: 'Match each organelle with a molecule that characterises it.', pairs: pick.map((o) => [o.name, o.keyMolecules![0]] as [string, string]), explanation: pick.map((o) => `${o.name}: ${o.keyMolecules!.slice(0, 3).join(', ')}`).join('; ') })
  return out
}

let ALL: Question[] | null = null
export function allQuestions(): Question[] {
  ALL ??= [...QUESTIONS, ...generatedQuestions()]
  return ALL
}

export function questionById(id: string) {
  return allQuestions().find((q) => q.id === id)
}

export interface QuizFilter {
  topic?: Topic | 'all'
  type?: Question['type'] | 'all'
  tags?: string[]
  count?: number
  seed?: number
  /** Topics to over-weight (weak areas). */
  prefer?: Topic[]
}

export function buildQuiz(f: QuizFilter): Question[] {
  const r = rng(f.seed ?? Date.now())
  let pool = allQuestions()
  if (f.topic && f.topic !== 'all') pool = pool.filter((q) => q.topic === f.topic)
  if (f.type && f.type !== 'all') pool = pool.filter((q) => q.type === f.type)
  if (f.tags?.length) {
    const tagged = pool.filter((q) => q.tags.some((t) => f.tags!.includes(t)))
    if (tagged.length >= 3) pool = tagged
  }
  let ordered = shuffle(pool, r)
  if (f.prefer?.length) ordered = [...ordered.filter((q) => f.prefer!.includes(q.topic)), ...ordered.filter((q) => !f.prefer!.includes(q.topic))]
  return ordered.slice(0, f.count ?? 10)
}

export const entityName = (id: string) => ENTITY_MAP[id]?.name ?? id
