import { CELL_CYCLE_PHASES } from '../data/cellCycle'

export const PHASES = CELL_CYCLE_PHASES
export const OFFSETS = (() => {
  const o: number[] = []
  let acc = 0
  for (const p of PHASES) {
    o.push(acc)
    acc += p.seconds
  }
  return o
})()
export const TOTAL = PHASES.reduce((s, p) => s + p.seconds, 0)

export function phaseAt(t: number) {
  let i = PHASES.length - 1
  for (let k = 0; k < PHASES.length; k++) {
    if (t < OFFSETS[k] + PHASES[k].seconds) {
      i = k
      break
    }
  }
  const p = Math.min(1, Math.max(0, (t - OFFSETS[i]) / PHASES[i].seconds))
  return { index: i, phase: PHASES[i], p }
}

export const phaseIndex = (id: string) => PHASES.findIndex((p) => p.id === id)
export const phaseStart = (id: string) => OFFSETS[phaseIndex(id)] ?? 0
