import type { Pathway, PathwayEdge } from '../data/schema'

/** Main-path reactions in flux order. */
export function reactionOrder(p: Pathway): PathwayEdge[] {
  const main = p.edges.filter((e) => !e.optional)
  const indeg = new Map<string, number>()
  main.forEach((e) => indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1))
  const start = main.find((e) => !indeg.get(e.from))?.from ?? main[0]?.from
  const out: PathwayEdge[] = []
  const used = new Set<PathwayEdge>()
  let cur = start
  while (cur) {
    const next = main.find((e) => e.from === cur && !used.has(e))
    if (!next) break
    used.add(next)
    out.push(next)
    cur = next.to
  }
  for (const e of main) if (!used.has(e)) out.push(e)
  return out
}

export function ledger(order: PathwayEdge[], upto: number | null) {
  const tot: Record<string, number> = {}
  order.forEach((e, i) => {
    if (upto !== null && i > upto) return
    const m = e.multiplier ?? 1
    for (const [k, v] of Object.entries(e.energy ?? {})) tot[k] = (tot[k] ?? 0) + (v as number) * m
  })
  return tot
}

