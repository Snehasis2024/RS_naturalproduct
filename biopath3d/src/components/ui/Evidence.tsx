import type { Evidence } from '../../data/schema'

const META: Record<Evidence, { label: string; cls: string; tip: string }> = {
  established: {
    label: 'Established mechanism',
    cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    tip: 'Consensus mechanism supported by primary literature and textbooks.',
  },
  simplified: {
    label: 'Simplified teaching model',
    cls: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    tip: 'A real mechanism with steps merged or components omitted for clarity.',
  },
  hypothetical: {
    label: 'Hypothetical visualization',
    cls: 'border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200',
    tip: 'A visual metaphor — not a claim about the real molecular structure or pathway.',
  },
}

export function EvidenceBadge({ level, compact }: { level: Evidence; compact?: boolean }) {
  const m = META[level]
  return (
    <span title={m.tip} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {compact ? level : m.label}
    </span>
  )
}

export function EvidenceLegend() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(META) as Evidence[]).map((k) => (
        <EvidenceBadge key={k} level={k} />
      ))}
    </div>
  )
}
