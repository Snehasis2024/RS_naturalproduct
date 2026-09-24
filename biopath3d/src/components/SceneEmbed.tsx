import { useEffect } from 'react'
import type { SceneRef } from '../data/schema'
import { SceneShell } from './three/SceneShell'
import { CellModel } from './three/cell/CellModel'
import { CellCycleScene } from '../scenes/CellCycleScene'
import { useSimClock } from '../engine/clock'
import { PHASES, phaseStart } from '../engine/cellCycleTimeline'
import { PATHWAY_MAP, ENTITY_MAP } from '../data'
import { PathwayView } from './PathwayView'
import { MetabolicView } from '../modules/Metabolism'
import { DogmaStage } from '../modules/CentralDogma'
import { MoleculeStage } from '../modules/MolecularViewer'
import { useStore } from '../store/useStore'

function CellEmbed({ organelle, explode }: { organelle?: string; explode?: boolean }) {
  const select = useStore((s) => s.select)
  const showLabels = useStore((s) => s.showLabels)
  useEffect(() => {
    if (organelle && ENTITY_MAP[organelle]) select({ kind: 'organelle', id: organelle, label: ENTITY_MAP[organelle].name })
  }, [organelle, select])
  return (
    <SceneShell camera={[0, 3, 13]}>
      <CellModel selected={organelle ?? null} explode={explode ? 1 : 0} labels={showLabels} onSelect={(id) => id && ENTITY_MAP[id] && select({ kind: 'organelle', id, label: ENTITY_MAP[id].name })} />
    </SceneShell>
  )
}

function CellCycleEmbed({ phase }: { phase: string }) {
  const ph = PHASES.find((p) => p.id === phase) ?? PHASES[1]
  const start = phaseStart(ph.id)
  const clock = useSimClock({ t: start, start, end: start + ph.seconds, loop: true })
  const showLabels = useStore((s) => s.showLabels)
  return (
    <>
      <SceneShell camera={[0, 1.5, 10]}>
        <CellCycleScene clock={clock} labels={showLabels} />
      </SceneShell>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-[11px] text-slate-300">
        Looping {ph.name} · open the Cell Cycle module for full controls
      </div>
    </>
  )
}

/** Renders any lesson SceneRef using the same components as the full modules. */
export function SceneEmbed({ scene }: { scene: SceneRef }) {
  switch (scene.type) {
    case 'cell':
      return <CellEmbed organelle={scene.organelle} explode={scene.explode} />
    case 'cellcycle':
      return <CellCycleEmbed key={scene.phase} phase={scene.phase} />
    case 'pathway':
      return <PathwayView key={scene.pathway + scene.step} pathway={PATHWAY_MAP[scene.pathway]} initialStep={scene.step ?? null} compact hideHeader />
    case 'metabolic':
      return <MetabolicView key={scene.pathway + scene.step} pathway={PATHWAY_MAP[scene.pathway]} initialStep={scene.step ?? null} compact />
    case 'dogma':
      return <DogmaStage key={scene.stage} stage={scene.stage} compact />
    case 'molecule':
      return <MoleculeStage key={scene.id} id={scene.id} compact />
  }
}
