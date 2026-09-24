import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ENTITY_MAP, PATHWAYS } from '../../data'
import type { Entity, Evidence } from '../../data/schema'
import { useStore } from '../../store/useStore'
import { navigate } from '../../store/router'
import { routeForPathway } from '../../engine/search'
import { allQuestions } from '../../engine/quizGen'
import { EvidenceBadge } from '../ui/Evidence'
import { QuestionView } from '../ui/QuestionView'
import { Icon } from '../ui/Icon'
import { STRUCTURES } from '../../data/structures'

export interface SelectionDetail {
  description?: string
  sections?: { title: string; body: string }[]
  evidence?: Evidence
  links?: { label: string; route: string }[]
  chips?: string[]
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h4 className="section-title">{title}</h4>
      <div className="text-[13px] leading-relaxed text-slate-300">{children}</div>
    </section>
  )
}

export function EntityCard({ e, extra }: { e: Entity; extra?: SelectionDetail }) {
  const select = useStore((s) => s.select)
  const setTutorOpen = useStore((s) => s.setTutorOpen)
  const quiz = useMemo(() => allQuestions().find((q) => q.tags.includes(e.id) && (q.type === 'mcq' || q.type === 'mechanism' || q.type === 'identify')), [e.id])
  const recordAttempt = useStore((s) => s.recordAttempt)
  const pathways = useMemo(() => {
    const ids = new Set([...(e.relatedPathways ?? []), ...PATHWAYS.filter((p) => p.nodes.some((n) => n.ref === e.id)).map((p) => p.id)])
    return PATHWAYS.filter((p) => ids.has(p.id))
  }, [e])
  const structure = e.pdb?.find((id) => STRUCTURES.some((s) => s.pdb === id))
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="chip capitalize">{e.kind}</span>
          {e.gene && <span className="chip font-mono">{e.gene}</span>}
          <EvidenceBadge level={e.evidence} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-white">{e.name}</h3>
        <p className="mt-1 text-[13px] text-slate-300">{e.summary}</p>
      </div>
      {extra?.description && (
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2.5 text-[13px] text-cyan-50">{extra.description}</div>
      )}
      {extra?.sections?.map((s) => (
        <Section key={s.title} title={s.title}>
          <p className="whitespace-pre-line">{s.body}</p>
        </Section>
      ))}
      {e.function && <Section title="Function">{e.function}</Section>}
      {e.structure && <Section title="Structure">{e.structure}</Section>}
      {!!e.keyMolecules?.length && (
        <Section title="Key molecules">
          <div className="flex flex-wrap gap-1.5">
            {e.keyMolecules.map((m) => {
              const hit = Object.values(ENTITY_MAP).find((x) => x.name.toLowerCase().includes(m.toLowerCase()) || x.aliases?.some((a) => a.toLowerCase() === m.toLowerCase()))
              return hit ? (
                <button key={m} className="chip" onClick={() => select({ kind: 'protein', id: hit.id, label: hit.name })}>
                  {m}
                </button>
              ) : (
                <span key={m} className="chip">{m}</span>
              )
            })}
          </div>
        </Section>
      )}
      {!!pathways.length && (
        <Section title="Related pathways">
          <div className="flex flex-wrap gap-1.5">
            {pathways.map((p) => (
              <button key={p.id} className="chip border-emerald-400/30 text-emerald-200" onClick={() => navigate(routeForPathway(p.id, e.id))}>
                {p.name}
              </button>
            ))}
          </div>
        </Section>
      )}
      {e.clinical && <Section title="Clinical relevance">{e.clinical}</Section>}
      <div className="flex flex-wrap gap-1.5">
        <button className="btn" onClick={() => setTutorOpen(true)}>
          🤖 Ask BioTutor
        </button>
        {structure && (
          <button className="btn" onClick={() => navigate(`/molecules?id=${structure}`)}>
            🔬 3D structure ({structure})
          </button>
        )}
        {e.mol && (
          <button className="btn" onClick={() => navigate(`/molecules?id=${e.mol}`)}>
            ⚗️ {e.mol === 'erlotinib' || e.mol === 'palbociclib' || e.mol === 'metformin' ? 'Drug' : 'Molecule'} 3D
          </button>
        )}
        {e.kind === 'organelle' && (
          <button className="btn" onClick={() => navigate(`/cell?select=${e.id}`)}>
            🧫 Show in cell
          </button>
        )}
      </div>
      {quiz && (
        <Section title="Quick quiz">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <QuestionView key={quiz.id} q={quiz} compact onAnswered={(ok) => recordAttempt({ qid: quiz.id, topic: quiz.topic, correct: ok })} />
          </div>
        </Section>
      )}
      {!!e.references?.length && (
        <Section title="References & databases">
          <ul className="space-y-1">
            {e.references.map((r) => (
              <li key={r.url}>
                <a className="text-cyan-300 underline-offset-2 hover:underline" href={r.url} target="_blank" rel="noreferrer">
                  {r.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function useWide(min = 1536) {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= min)
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= min)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [min])
  return wide
}

export function InfoPanel() {
  const selection = useStore((s) => s.selection)
  const rightOpen = useStore((s) => s.rightOpen)
  const setRightOpen = useStore((s) => s.setRightOpen)
  const select = useStore((s) => s.select)
  const wide = useWide()
  if (!rightOpen) return null
  // On narrower screens the panel only takes space once something is selected.
  if (!selection && !wide) return null
  const entity = selection ? ENTITY_MAP[selection.id] : undefined
  const detail = selection?.detail as SelectionDetail | undefined
  return (
    <aside className="glass-strong scroll-thin fixed inset-x-2 bottom-2 z-30 max-h-[55vh] overflow-y-auto rounded-2xl p-4 md:static md:inset-auto md:z-auto md:max-h-none md:w-[340px] md:shrink-0 md:rounded-none md:border-y-0 md:border-r-0 xl:w-[380px]">
      <div className="mb-3 flex items-center justify-between">
        <span className="section-title">Selected object</span>
        <div className="flex gap-1">
          {selection && (
            <button className="btn px-2 py-1 text-xs" onClick={() => select(null)}>
              Clear
            </button>
          )}
          <button className="btn px-2 py-1" onClick={() => setRightOpen(false)} aria-label="Close panel">
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {!selection && (
        <div className="space-y-3 text-sm text-slate-400">
          <p>Click any 3D object — an organelle, chromosome, protein node, metabolite or residue — to see its name, function, structure, key molecules, related pathways, clinical relevance and a quick quiz.</p>
          <p className="text-xs">Tip: press <kbd className="rounded border border-white/15 px-1">/</kbd> to search.</p>
        </div>
      )}
      {selection && entity && <EntityCard e={entity} extra={detail} />}
      {selection && !entity && (
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="chip capitalize">{selection.kind.replace('-', ' ')}</span>
              {detail?.evidence && <EvidenceBadge level={detail.evidence} />}
            </div>
            <h3 className="text-xl font-semibold text-white">{selection.label}</h3>
            {detail?.description && <p className="mt-1 text-[13px] text-slate-300">{detail.description}</p>}
          </div>
          {detail?.chips && (
            <div className="flex flex-wrap gap-1.5">
              {detail.chips.map((c) => (
                <span key={c} className="chip">{c}</span>
              ))}
            </div>
          )}
          {detail?.sections?.map((s) => (
            <Section key={s.title} title={s.title}>
              <p className="whitespace-pre-line">{s.body}</p>
            </Section>
          ))}
          {!!detail?.links?.length && (
            <div className="flex flex-wrap gap-1.5">
              {detail.links.map((l) => (
                <button key={l.route + l.label} className="btn" onClick={() => (l.route.startsWith('http') ? window.open(l.route, '_blank') : navigate(l.route))}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
