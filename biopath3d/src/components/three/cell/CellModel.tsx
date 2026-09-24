import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { CellContext, type CellCtx } from './context'
import { pickPart } from './Part'
import { Centrosome, Cytoplasm, ER, Golgi, Lysosomes, Membrane, Mitochondria, Nucleus, Peroxisomes, Ribosomes, VesicleTraffic } from './Organelles'

export interface CellModelProps extends Partial<CellCtx> {
  onSelect?: (id: string | null) => void
  onHover?: (id: string | null) => void
  traffic?: boolean
  interactive?: boolean
}

/** Procedural animal cell. Every organelle is a real mesh that can be picked, hidden, isolated and exploded. */
export function CellModel({ onSelect, onHover, traffic = true, interactive = true, ...ctx }: CellModelProps) {
  const value = useMemo<CellCtx>(
    () => ({
      hover: ctx.hover ?? null,
      selected: ctx.selected ?? null,
      isolate: ctx.isolate ?? null,
      hidden: ctx.hidden ?? new Set(),
      explode: ctx.explode ?? 0,
      transparent: ctx.transparent ?? false,
      labels: ctx.labels ?? true,
      highlight: ctx.highlight ?? null,
    }),
    [ctx.hover, ctx.selected, ctx.isolate, ctx.hidden, ctx.explode, ctx.transparent, ctx.labels, ctx.highlight],
  )
  const handlers = interactive
    ? {
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onHover?.(pickPart(e.intersections))
        },
        onPointerOut: () => onHover?.(null),
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onSelect?.(pickPart(e.intersections))
        },
      }
    : {}
  return (
    <CellContext.Provider value={value}>
      <group {...handlers}>
        <Membrane />
        <Cytoplasm />
        <Nucleus />
        <ER />
        <Golgi />
        <Mitochondria />
        <Ribosomes />
        <Lysosomes />
        <Peroxisomes />
        <Centrosome />
        {traffic && !value.isolate && value.explode < 0.05 && <VesicleTraffic />}
      </group>
    </CellContext.Provider>
  )
}
