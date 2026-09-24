import { createContext, useContext } from 'react'

export type PartState = 'normal' | 'hover' | 'selected' | 'dim' | 'hidden'

export interface CellCtx {
  hover: string | null
  selected: string | null
  isolate: string | null
  hidden: Set<string>
  explode: number
  transparent: boolean
  labels: boolean
  /** Forces a highlight without selection (quiz / lessons). */
  highlight: string | null
}

export const CellContext = createContext<CellCtx>({
  hover: null,
  selected: null,
  isolate: null,
  hidden: new Set(),
  explode: 0,
  transparent: false,
  labels: true,
  highlight: null,
})

export function usePartState(id: string): PartState {
  const c = useContext(CellContext)
  if (c.hidden.has(id)) return 'hidden'
  if (c.isolate && c.isolate !== id && !(c.isolate === 'nucleus' && id === 'nucleolus')) return 'hidden'
  if (c.highlight) return c.highlight === id ? 'selected' : 'dim'
  if (c.selected === id) return 'selected'
  if (c.hover === id) return 'hover'
  if (c.selected) return 'dim'
  return 'normal'
}

export const useCell = () => useContext(CellContext)
