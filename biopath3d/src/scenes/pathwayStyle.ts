import type { EdgeType, NodeType, Compartment } from '../data/schema'

export const NODE_COLOR: Record<NodeType, string> = {
  ligand: '#fde047', receptor: '#22d3ee', adaptor: '#93c5fd', gtpase: '#34d399', kinase: '#a78bfa', phosphatase: '#f472b6',
  enzyme: '#60a5fa', 'transcription-factor': '#f59e0b', inhibitor: '#ef4444', complex: '#818cf8', 'second-messenger': '#facc15',
  metabolite: '#38bdf8', gene: '#e879f9', stimulus: '#fb7185', outcome: '#10b981', process: '#2dd4bf', pathway: '#38bdf8',
  protein: '#c084fc', organelle: '#fb7185', drug: '#f97316',
}

export const EDGE_COLOR: Record<EdgeType, string> = {
  activation: '#22d3ee', phosphorylation: '#facc15', dephosphorylation: '#f472b6', inhibition: '#ef4444', binding: '#93c5fd',
  translocation: '#a78bfa', transcription: '#e879f9', cleavage: '#fb923c', release: '#fda4af', conversion: '#38bdf8',
  degradation: '#64748b', crosstalk: '#94a3b8',
}

export const EDGE_LABEL: Record<EdgeType, string> = {
  activation: 'activates', phosphorylation: 'phosphorylates', dephosphorylation: 'dephosphorylates', inhibition: 'inhibits', binding: 'binds',
  translocation: 'translocates to', transcription: 'induces transcription of', cleavage: 'cleaves', release: 'releases', conversion: 'is converted to',
  degradation: 'targets for degradation', crosstalk: 'cross-talks with',
}

export const COMPARTMENT_STYLE: Record<Compartment, { label: string; color: string }> = {
  extracellular: { label: 'Extracellular space', color: '#0ea5e9' },
  membrane: { label: 'Plasma membrane', color: '#22d3ee' },
  cytoplasm: { label: 'Cytoplasm', color: '#6366f1' },
  mitochondrion: { label: 'Mitochondrion', color: '#fb7185' },
  nucleus: { label: 'Nucleus', color: '#a855f7' },
  outcome: { label: 'Cellular outcome', color: '#10b981' },
}
