import type { Compartment, Pathway } from '../data/schema'

export type Vec3 = [number, number, number]

const COMPARTMENT_ORDER: Compartment[] = ['extracellular', 'membrane', 'cytoplasm', 'mitochondrion', 'nucleus', 'outcome']

/** Longest-path depth from sources, ignoring feedback (back) edges. */
function depths(p: Pathway): Map<string, number> {
  const out = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  for (const n of p.nodes) {
    out.set(n.id, [])
    indeg.set(n.id, 0)
  }
  // Drop back edges found by DFS so the graph is a DAG.
  const state = new Map<string, number>()
  const keep: [string, string][] = []
  const adj = new Map<string, string[]>()
  for (const n of p.nodes) adj.set(n.id, [])
  for (const e of p.edges) adj.get(e.from)!.push(e.to)
  const dfs = (u: string) => {
    state.set(u, 1)
    for (const v of adj.get(u)!) {
      if (state.get(v) === 1) continue // back edge
      keep.push([u, v])
      if (!state.get(v)) dfs(v)
    }
    state.set(u, 2)
  }
  for (const n of p.nodes) if (!state.get(n.id)) dfs(n.id)
  for (const [u, v] of keep) {
    out.get(u)!.push(v)
    indeg.set(v, indeg.get(v)! + 1)
  }
  const depth = new Map<string, number>()
  const queue = p.nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id)
  for (const id of queue) depth.set(id, 0)
  while (queue.length) {
    const u = queue.shift()!
    for (const v of out.get(u)!) {
      depth.set(v, Math.max(depth.get(v) ?? 0, depth.get(u)! + 1))
      indeg.set(v, indeg.get(v)! - 1)
      if (indeg.get(v) === 0) queue.push(v)
    }
  }
  return depth
}

function layered(p: Pathway): Record<string, Vec3> {
  const d = depths(p)
  // Respect compartment ordering so the membrane is above the cytoplasm, etc.
  const nodes = [...p.nodes]
  const layerOf = new Map<string, number>()
  for (const n of nodes) layerOf.set(n.id, n.layer ?? d.get(n.id) ?? 0)
  // Push outcomes to the bottom.
  const maxLayer = Math.max(...layerOf.values())
  for (const n of nodes) if (n.compartment === 'outcome' || n.type === 'outcome') layerOf.set(n.id, Math.max(layerOf.get(n.id)!, maxLayer))
  const byLayer = new Map<number, string[]>()
  for (const n of nodes) {
    const l = layerOf.get(n.id)!
    if (!byLayer.has(l)) byLayer.set(l, [])
    byLayer.get(l)!.push(n.id)
  }
  const pos: Record<string, Vec3> = {}
  const layers = [...byLayer.keys()].sort((a, b) => a - b)
  const spacingY = 1.75
  const total = (layers.length - 1) * spacingY
  layers.forEach((l, i) => {
    const ids = byLayer.get(l)!
    ids.sort((a, b) => {
      const ca = COMPARTMENT_ORDER.indexOf(p.nodes.find((n) => n.id === a)!.compartment ?? 'cytoplasm')
      const cb = COMPARTMENT_ORDER.indexOf(p.nodes.find((n) => n.id === b)!.compartment ?? 'cytoplasm')
      return ca - cb
    })
    const spacingX = 3.1
    ids.forEach((id, j) => {
      // single-node layers zig-zag so consecutive labels do not collide
      const x = ids.length === 1 ? (i % 2 ? 0.9 : -0.9) : (j - (ids.length - 1) / 2) * spacingX
      // gentle depth variation so the network reads as 3D
      const z = ids.length > 1 ? Math.sin(j * 1.7 + i) * 0.8 : 0
      pos[id] = [x, total / 2 - i * spacingY, z]
    })
  })
  return pos
}

function cycle(p: Pathway): Record<string, Vec3> {
  // Main ring = nodes on the directed cycle; others placed outside near their neighbour.
  const main = p.edges.filter((e) => !e.optional)
  const ringIds: string[] = []
  const next = new Map(main.map((e) => [e.from, e.to]))
  let start = main[0]?.from
  const seen = new Set<string>()
  while (start && !seen.has(start)) {
    seen.add(start)
    ringIds.push(start)
    start = next.get(start)!
  }
  const r = Math.max(4, ringIds.length * 0.75)
  const pos: Record<string, Vec3> = {}
  ringIds.forEach((id, i) => {
    const a = Math.PI / 2 - (i / ringIds.length) * Math.PI * 2
    pos[id] = [Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 2) * 0.4]
  })
  // Place off-ring nodes outward from an already placed neighbour (multiple passes for chains of feeders).
  for (let pass = 0; pass < 6; pass++) {
    const outside = p.nodes.filter((n) => !pos[n.id])
    if (!outside.length) break
    outside.forEach((n, k) => {
      const nb = p.edges.find((e) => (e.from === n.id && pos[e.to]) || (e.to === n.id && pos[e.from]))
      if (!nb && pass < 5) return
      const anchor = nb ? pos[nb.from === n.id ? nb.to : nb.from] : ([0, 0, 0] as Vec3)
      const len = Math.hypot(anchor[0], anchor[1]) || 1
      const f = (len + 3) / len
      pos[n.id] = [anchor[0] * f + 0.6 * (k % 2 ? 1 : -1), anchor[1] * f, 0.8]
    })
  }
  return pos
}

function chain(p: Pathway): Record<string, Vec3> {
  // Main path placed on a serpentine; side nodes offset beside their neighbour.
  const main = p.edges.filter((e) => !e.optional)
  const d = depths({ ...p, edges: main })
  const onMain = new Set(main.flatMap((e) => [e.from, e.to]))
  const ordered = p.nodes.filter((n) => onMain.has(n.id)).sort((a, b) => (d.get(a.id) ?? 0) - (d.get(b.id) ?? 0))
  const perRow = 3
  const pos: Record<string, Vec3> = {}
  ordered.forEach((n, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    const x = (row % 2 === 0 ? col : perRow - 1 - col) * 4.4 - ((perRow - 1) * 4.4) / 2
    pos[n.id] = [x, -row * 3.6, Math.sin(i * 0.9) * 0.6]
  })
  const rows = Math.ceil(ordered.length / perRow)
  const shift = ((rows - 1) * 3.6) / 2
  for (const id in pos) pos[id][1] += shift
  p.nodes
    .filter((n) => !pos[n.id])
    .forEach((n, k) => {
      const nb = p.edges.find((e) => (e.from === n.id && pos[e.to]) || (e.to === n.id && pos[e.from]))
      const a = nb ? pos[nb.from === n.id ? nb.to : nb.from] : ([0, 0, 0] as Vec3)
      pos[n.id] = [a[0] + (k % 2 ? -1.6 : 1.6), a[1] + 1.8, a[2] + 2.2]
    })
  return pos
}

/** Deterministic 3D force-directed layout for maps. */
function force(p: Pathway): Record<string, Vec3> {
  let seed = 42
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  const ids = p.nodes.map((n) => n.id)
  const P: Record<string, Vec3> = {}
  ids.forEach((id) => (P[id] = [rnd() * 6, rnd() * 6, rnd() * 6]))
  const k = 4.2
  for (let it = 0; it < 400; it++) {
    const F: Record<string, Vec3> = {}
    ids.forEach((id) => (F[id] = [0, 0, 0]))
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = P[ids[i]], b = P[ids[j]]
        const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2]
        const dist = Math.max(0.1, Math.hypot(dx, dy, dz))
        const f = (k * k) / dist / dist
        for (const [v, s] of [[F[ids[i]], 1], [F[ids[j]], -1]] as [Vec3, number][]) {
          v[0] += (dx / dist) * f * s; v[1] += (dy / dist) * f * s; v[2] += (dz / dist) * f * s
        }
      }
    for (const e of p.edges) {
      const a = P[e.from], b = P[e.to]
      const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2]
      const dist = Math.max(0.1, Math.hypot(dx, dy, dz))
      const f = (dist * dist) / k / 3
      F[e.from][0] -= (dx / dist) * f; F[e.from][1] -= (dy / dist) * f; F[e.from][2] -= (dz / dist) * f
      F[e.to][0] += (dx / dist) * f; F[e.to][1] += (dy / dist) * f; F[e.to][2] += (dz / dist) * f
    }
    const t = 0.12 * (1 - it / 400) + 0.01
    ids.forEach((id) => {
      const f = F[id]
      const m = Math.max(1e-6, Math.hypot(...f))
      const step = Math.min(m, 2) * t
      P[id][0] += (f[0] / m) * step; P[id][1] += (f[1] / m) * step; P[id][2] += (f[2] / m) * step * 0.6
    })
  }
  // centre
  const c = [0, 1, 2].map((ax) => ids.reduce((s, id) => s + P[id][ax], 0) / ids.length)
  ids.forEach((id) => (P[id] = [P[id][0] - c[0], P[id][1] - c[1], P[id][2] - c[2]]))
  return P
}

export function layoutPathway(p: Pathway): Record<string, Vec3> {
  switch (p.layout) {
    case 'cycle':
      return cycle(p)
    case 'chain':
      return chain(p)
    case 'force':
      return force(p)
    case 'manual': {
      const base = layered(p)
      for (const n of p.nodes) if (n.pos) base[n.id] = n.pos
      return base
    }
    default:
      return layered(p)
  }
}

export function bounds(pos: Record<string, Vec3>) {
  const v = Object.values(pos)
  const min = [0, 1, 2].map((i) => Math.min(...v.map((p) => p[i])))
  const max = [0, 1, 2].map((i) => Math.max(...v.map((p) => p[i])))
  const size = Math.max(max[0] - min[0], max[1] - min[1], 4)
  return { min, max, size, center: [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as Vec3 }
}
