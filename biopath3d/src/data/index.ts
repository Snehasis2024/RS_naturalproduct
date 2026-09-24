/**
 * Content registry. Pathway JSON files dropped into ./pathways or ./metabolic
 * are discovered automatically at build time (import.meta.glob) — no code
 * changes are needed to add a pathway.
 */
import type { CompactPathway, Entity, Pathway, SmallMolecule } from './schema'
import { ORGANELLES } from './organelles'
import { PROTEINS } from './proteins'
import smallMolecules from './generated/smallMolecules.json'
import { normalizePathway } from '../engine/normalize'

const files = import.meta.glob<{ default: Pathway | CompactPathway }>(['./pathways/*.json', './metabolic/*.json'], {
  eager: true,
})

export const PATHWAYS: Pathway[] = Object.values(files).map((m) => normalizePathway(m.default))
export const PATHWAY_MAP: Record<string, Pathway> = Object.fromEntries(PATHWAYS.map((p) => [p.id, p]))

export const MOLECULES = smallMolecules as SmallMolecule[]
export const MOLECULE_MAP: Record<string, SmallMolecule> = Object.fromEntries(MOLECULES.map((m) => [m.id, m]))

export const ENTITIES: Entity[] = [...ORGANELLES, ...PROTEINS]
export const ENTITY_MAP: Record<string, Entity> = Object.fromEntries(ENTITIES.map((e) => [e.id, e]))

export const pathwaysBy = (category: Pathway['category']) =>
  PATHWAYS.filter((p) => p.category === category).sort((a, b) => a.name.localeCompare(b.name))

/** Which pathways mention an entity (via node refs). */
export function pathwaysForEntity(id: string): Pathway[] {
  return PATHWAYS.filter((p) => p.nodes.some((n) => n.ref === id))
}
