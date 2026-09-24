export interface NavItem {
  path: string
  label: string
  icon: string
  sub?: boolean
}

export const NAV: NavItem[] = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/universe', label: 'Biology Universe', icon: '🌌', sub: true },
  { path: '/cell', label: 'Cell Explorer', icon: '🧫' },
  { path: '/cellcycle', label: 'Cell Cycle', icon: '🔄' },
  { path: '/regulation', label: 'Cycle Regulation', icon: '⚙️', sub: true },
  { path: '/dogma', label: 'DNA → RNA → Protein', icon: '🧬' },
  { path: '/signaling', label: 'Signaling', icon: '📡' },
  { path: '/map', label: 'Pathway Map', icon: '🕸️', sub: true },
  { path: '/metabolism', label: 'Metabolism', icon: '⚡' },
  { path: '/apoptosis', label: 'Apoptosis', icon: '💀' },
  { path: '/molecules', label: 'Molecular Viewer', icon: '🔬' },
  { path: '/learn', label: 'Learn', icon: '🧠' },
  { path: '/quiz', label: 'Quiz', icon: '📝' },
  { path: '/progress', label: 'Progress', icon: '📊' },
  { path: '/tutor', label: 'BioTutor', icon: '🤖' },
]
