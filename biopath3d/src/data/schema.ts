/**
 * BioPath 3D content schemas.
 *
 * Every biological object in the app (organelle, protein, gene, molecule,
 * pathway, process, lesson, question) is plain data that conforms to one of
 * these types. Modules render whatever the registries contain, so new content
 * is added by adding data, not by writing new components.
 */

/**
 * How much confidence the learner should place in what they see.
 * - established:  textbook/consensus mechanism supported by primary literature
 * - simplified:   real mechanism, deliberately reduced for teaching (steps merged, components omitted)
 * - hypothetical: a visual metaphor or speculative model; NOT a claim about biology
 */
export type Evidence = 'established' | 'simplified' | 'hypothetical'

export interface Reference {
  label: string
  url: string
}

export type Topic =
  | 'cell-biology'
  | 'molecular-biology'
  | 'signaling'
  | 'metabolism'
  | 'pathways'

export type EntityKind =
  | 'organelle'
  | 'protein'
  | 'complex'
  | 'gene'
  | 'molecule'
  | 'process'
  | 'structure'

/** Three-level explanations used by the Learn mode and BioTutor. */
export interface Levels {
  beginner: string
  intermediate: string
  advanced: string
}

/** A knowledge-base entry. Pathway nodes point at these through `ref`. */
export interface Entity {
  id: string
  name: string
  kind: EntityKind
  aliases?: string[]
  /** Official HGNC gene symbol for human proteins/genes. */
  gene?: string
  summary: string
  function?: string
  structure?: string
  keyMolecules?: string[]
  /** Pathway ids (see pathway registry). */
  relatedPathways?: string[]
  clinical?: string
  evidence: Evidence
  uniprot?: string
  /** PDB ids of experimentally determined structures relevant to this entity. */
  pdb?: string[]
  /** Small-molecule id in the generated conformer library. */
  mol?: string
  levels?: Levels
  references?: Reference[]
  topic?: Topic
}

// ---------------------------------------------------------------- pathways

export type NodeType =
  | 'ligand'
  | 'receptor'
  | 'adaptor'
  | 'gtpase'
  | 'kinase'
  | 'phosphatase'
  | 'enzyme'
  | 'transcription-factor'
  | 'inhibitor'
  | 'complex'
  | 'second-messenger'
  | 'metabolite'
  | 'gene'
  | 'stimulus'
  | 'outcome'
  | 'process'
  | 'pathway'
  | 'protein'
  | 'organelle'
  | 'drug'

export type Compartment =
  | 'extracellular'
  | 'membrane'
  | 'cytoplasm'
  | 'mitochondrion'
  | 'nucleus'
  | 'outcome'

export type EdgeType =
  | 'activation'
  | 'inhibition'
  | 'phosphorylation'
  | 'dephosphorylation'
  | 'binding'
  | 'translocation'
  | 'transcription'
  | 'cleavage'
  | 'release'
  | 'conversion'
  | 'degradation'
  | 'crosstalk'

export interface PathwayNode {
  id: string
  label: string
  type: NodeType
  /** Knowledge-base entity id. */
  ref?: string
  compartment?: Compartment
  description?: string
  /** Optional layout hints. */
  layer?: number
  pos?: [number, number, number]
  /** Small-molecule conformer id to render as the node (metabolic maps). */
  mol?: string
  /** Pathway id to jump to (connection map). */
  link?: string
  evidence?: Evidence
}

export interface EnergyDelta {
  atp?: number
  gtp?: number
  nadh?: number
  fadh2?: number
  nadph?: number
  co2?: number
  h2o?: number
  /** Protons translocated across the inner mitochondrial membrane. */
  hplus?: number
}

export interface EnzymeInfo {
  name: string
  ec?: string
  ref?: string
  regulation?: string
}

export interface PathwayEdge {
  from: string
  to: string
  type: EdgeType
  label?: string
  description?: string
  evidence?: Evidence
  /** Metabolic reactions. */
  enzyme?: EnzymeInfo
  cofactorsIn?: string[]
  cofactorsOut?: string[]
  energy?: EnergyDelta
  reversible?: boolean
  /** Stoichiometric multiplier used by the energy ledger (e.g. ×2 after aldolase). */
  multiplier?: number
  /** Side branch not on the main flux path (excluded from the energy ledger). */
  optional?: boolean
}

/** A narrated step of the pathway walkthrough. */
export interface PathwayStep {
  title: string
  text: string
  nodes?: string[]
  edges?: [string, string][]
}

export type PathwayCategory = 'signaling' | 'regulation' | 'apoptosis' | 'metabolic' | 'map'
export type LayoutKind = 'layered' | 'cycle' | 'chain' | 'force' | 'manual'

export interface Pathway {
  id: string
  name: string
  category: PathwayCategory
  summary: string
  evidence: Evidence
  layout: LayoutKind
  nodes: PathwayNode[]
  edges: PathwayEdge[]
  steps?: PathwayStep[]
  outcomes?: string[]
  clinical?: string
  references?: Reference[]
  topic?: Topic
  /** Net stoichiometry (metabolic). */
  net?: string
  location?: string
}

/**
 * The compact authoring format from the spec:
 *   { "pathway": "MAPK", "steps": [{ "name": "EGFR", "type": "receptor", "function": "...", "next": "GRB2" }] }
 * `normalizePathway` converts it into a full `Pathway`.
 */
export interface CompactPathway {
  pathway: string
  id?: string
  category?: PathwayCategory
  summary?: string
  evidence?: Evidence
  references?: Reference[]
  steps: {
    name: string
    id?: string
    type: NodeType
    function?: string
    ref?: string
    compartment?: Compartment
    next?: string | string[]
    edge?: EdgeType
  }[]
}

// ---------------------------------------------------------------- molecules

export interface SmallMolecule {
  id: string
  name: string
  smiles: string
  formula: string
  mw: number
  chebi: string
  /** [element, x, y, z] in Å (computed conformer). */
  atoms: [string, number, number, number][]
  bonds: [number, number, number][]
  source: 'computed'
}

export interface ProteinStructureInfo {
  pdb: string
  title: string
  entity?: string
  description: string
  function: string
  /** Residues to highlight: chain + residue number + note. */
  sites?: { chain?: string; resi: number; label: string }[]
  /** Ligand residue names (HETATM) to highlight. */
  ligands?: { resn: string; label: string }[]
  method?: string
}

// ---------------------------------------------------------------- lessons

export type SceneRef =
  | { type: 'cell'; organelle?: string; explode?: boolean }
  | { type: 'cellcycle'; phase: string }
  | { type: 'pathway'; pathway: string; step?: number; highlight?: string[] }
  | { type: 'metabolic'; pathway: string; step?: number }
  | { type: 'dogma'; stage: string }
  | { type: 'molecule'; id: string }

export type LessonStep =
  | { kind: 'explain'; title: string; text: string; evidence?: Evidence }
  | { kind: 'scene'; title: string; text: string; scene: SceneRef; highlight?: string[] }
  | { kind: 'mechanism'; title: string; points: string[]; evidence?: Evidence }
  | { kind: 'question'; questionId: string }

export interface Lesson {
  id: string
  title: string
  topic: Topic
  journey: string
  minutes: number
  objectives: string[]
  hook?: string
  steps: LessonStep[]
  /** Entity/pathway ids covered; used to build the post-lesson quiz. */
  tags: string[]
  module: string
}

// ---------------------------------------------------------------- questions

interface QuestionBase {
  id: string
  topic: Topic
  tags: string[]
  prompt: string
  explanation: string
  difficulty?: 1 | 2 | 3
}

export type Question =
  | (QuestionBase & { type: 'mcq' | 'mechanism'; options: string[]; answer: number })
  | (QuestionBase & { type: 'order'; items: string[] /* correct order */ })
  | (QuestionBase & { type: 'match'; pairs: [string, string][] })
  | (QuestionBase & { type: 'identify'; organelle: string; options: string[]; answer: number })

export type QuestionType = Question['type']
