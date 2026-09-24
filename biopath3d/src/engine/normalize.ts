import type { CompactPathway, Pathway, PathwayEdge, PathwayNode } from '../data/schema'

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function isCompact(p: Pathway | CompactPathway): p is CompactPathway {
  return 'pathway' in p && !('nodes' in p)
}

/** Accepts either the full schema or the compact `steps/next` format and returns a full Pathway. */
export function normalizePathway(input: Pathway | CompactPathway): Pathway {
  if (!isCompact(input)) {
    validate(input)
    return input
  }
  const ids = new Map<string, string>()
  for (const s of input.steps) ids.set(s.name, s.id ?? slug(s.name))
  const resolve = (ref: string) => ids.get(ref) ?? ref
  const nodes: PathwayNode[] = input.steps.map((s) => ({
    id: ids.get(s.name)!,
    label: s.name,
    type: s.type,
    ref: s.ref,
    compartment: s.compartment,
    description: s.function,
  }))
  const edges: PathwayEdge[] = []
  for (const s of input.steps) {
    const nexts = s.next === undefined ? [] : Array.isArray(s.next) ? s.next : [s.next]
    for (const n of nexts) edges.push({ from: ids.get(s.name)!, to: resolve(n), type: s.edge ?? 'activation' })
  }
  const p: Pathway = {
    id: input.id ?? slug(input.pathway),
    name: input.pathway,
    category: input.category ?? 'signaling',
    summary: input.summary ?? '',
    evidence: input.evidence ?? 'simplified',
    layout: 'layered',
    nodes,
    edges,
    references: input.references,
    topic: 'signaling',
  }
  validate(p)
  return p
}

/** Throws on dangling edges so broken content fails loudly in dev and tests. */
export function validate(p: Pathway) {
  const ids = new Set(p.nodes.map((n) => n.id))
  if (ids.size !== p.nodes.length) throw new Error(`Pathway ${p.id}: duplicate node ids`)
  for (const e of p.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) throw new Error(`Pathway ${p.id}: edge ${e.from}→${e.to} references a missing node`)
  }
  for (const s of p.steps ?? []) {
    for (const n of s.nodes ?? []) if (!ids.has(n)) throw new Error(`Pathway ${p.id}: step "${s.title}" references missing node ${n}`)
  }
}
