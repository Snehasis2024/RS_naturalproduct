/** Minimal PDB-format parser (ATOM/HETATM/HELIX/SHEET) for the molecular viewer. */
export interface PdbAtom {
  serial: number
  name: string
  resn: string
  chain: string
  resi: number
  x: number
  y: number
  z: number
  el: string
  het: boolean
}

export interface PdbModel {
  id: string
  title: string
  atoms: PdbAtom[]
  helices: { chain: string; start: number; end: number }[]
  sheets: { chain: string; start: number; end: number }[]
}

export function parsePdb(id: string, text: string): PdbModel {
  const atoms: PdbAtom[] = []
  const helices: PdbModel['helices'] = []
  const sheets: PdbModel['sheets'] = []
  let title = ''
  for (const line of text.split('\n')) {
    const rec = line.slice(0, 6)
    if (rec === 'TITLE ') title += line.slice(10).trim() + ' '
    else if (rec === 'HELIX ') helices.push({ chain: line[19], start: +line.slice(21, 25), end: +line.slice(33, 37) })
    else if (rec === 'SHEET ') sheets.push({ chain: line[21], start: +line.slice(22, 26), end: +line.slice(33, 37) })
    else if (rec === 'ENDMDL') break
    else if (rec === 'ATOM  ' || rec === 'HETATM') {
      const alt = line[16]
      if (alt !== ' ' && alt !== 'A') continue
      const name = line.slice(12, 16).trim()
      let el = line.slice(76, 78).trim()
      if (!el) el = name.replace(/[^A-Za-z]/g, '').slice(0, 1)
      el = el.length > 1 ? el[0].toUpperCase() + el[1].toLowerCase() : el.toUpperCase()
      atoms.push({
        serial: +line.slice(6, 11),
        name,
        resn: line.slice(17, 20).trim(),
        chain: line[21],
        resi: +line.slice(22, 26),
        x: +line.slice(30, 38),
        y: +line.slice(38, 46),
        z: +line.slice(46, 54),
        el,
        het: rec === 'HETATM',
      })
    }
  }
  return { id, title: title.trim(), atoms, helices, sheets }
}

const cache = new Map<string, Promise<PdbModel>>()

export function fetchPdb(id: string): Promise<PdbModel> {
  const key = id.toUpperCase()
  if (!cache.has(key)) {
    const p = fetch(`https://files.rcsb.org/download/${key}.pdb`)
      .then((r) => {
        if (!r.ok) throw new Error(`RCSB returned ${r.status}`)
        return r.text()
      })
      .then((t) => parsePdb(key, t))
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return cache.get(key)!
}

/** Covalent bonds inferred from interatomic distance (spatial hash). */
export function inferBonds(atoms: { x: number; y: number; z: number; el: string }[], maxLen = 1.9): [number, number][] {
  const cell = 2
  const grid = new Map<string, number[]>()
  const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  atoms.forEach((a, i) => {
    const k = key(a.x, a.y, a.z)
    if (!grid.has(k)) grid.set(k, [])
    grid.get(k)!.push(i)
  })
  const out: [number, number][] = []
  atoms.forEach((a, i) => {
    const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell), cz = Math.floor(a.z / cell)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          for (const j of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            if (j <= i) continue
            const b = atoms[j]
            const lim = a.el === 'H' || b.el === 'H' ? 1.25 : a.el === 'S' || b.el === 'S' || a.el === 'P' || b.el === 'P' ? 2.1 : maxLen
            const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
            if (d2 > 0.16 && d2 < lim * lim) out.push([i, j])
          }
        }
  })
  return out
}
