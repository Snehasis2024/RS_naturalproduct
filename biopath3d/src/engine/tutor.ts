/**
 * BioTutor offline engine: answers are composed only from the curated knowledge
 * base (no invented mechanisms). An optional Claude-backed mode lives in
 * tutorLLM.ts and receives the same grounding context.
 */
import type { Entity, Evidence, Pathway } from '../data/schema'
import { ENTITY_MAP, PATHWAY_MAP, PATHWAYS, ENTITIES } from '../data'
import { CELL_CYCLE_PHASES } from '../data/cellCycle'
import { DOGMA_STAGES } from '../data/dogma'
import { search, score, routeForPathway } from './search'

export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface TutorContext {
  kind: string
  id: string
  label: string
}

export interface TutorSource {
  label: string
  route: string
}

export interface TutorAnswer {
  text: string
  sources: TutorSource[]
  evidence: Evidence
  usedContext?: boolean
}

interface Faq {
  match: RegExp
  levels: Record<Level, string>
  sources: TutorSource[]
  evidence: Evidence
}

const FAQ: Faq[] = [
  {
    match: /(apoptosis).*(necrosis)|(necrosis).*(apoptosis)/i,
    evidence: 'established',
    sources: [{ label: 'Apoptosis module', route: '/apoptosis' }],
    levels: {
      beginner: 'Apoptosis is a tidy, planned self-destruction: the cell shrinks, packages itself into small pieces and is eaten by neighbours without causing inflammation. Necrosis is accidental death from injury: the cell swells and bursts, spilling its contents and causing inflammation.',
      intermediate: 'Apoptosis is an energy-requiring programme executed by caspases (initiators 8/9 → executioners 3/7): chromatin condenses, DNA is cut between nucleosomes (ladder), the membrane blebs and exposes phosphatidylserine, and apoptotic bodies are phagocytosed — no inflammation. Necrosis results from ATP depletion and membrane failure: organelles swell, the plasma membrane ruptures and released DAMPs trigger inflammation.',
      advanced: 'Apoptosis is caspase-dependent and non-lytic; its commitment points are MOMP (intrinsic, BAX/BAK) and DISC-mediated caspase-8 activation (extrinsic). Necrosis was classically unregulated, but regulated lytic forms exist: necroptosis (RIPK1–RIPK3–MLKL, engaged when caspase-8 is inhibited), pyroptosis (inflammatory caspases, gasdermin D pores) and ferroptosis (iron-dependent lipid peroxidation, GPX4 loss). The distinction therefore rests on mechanism and immunogenicity rather than on "programmed vs. accidental".',
    },
  },
  {
    match: /(why).*(dna|replicat).*(before|prior).*(mitosis|divi)/i,
    evidence: 'established',
    sources: [{ label: 'Cell Cycle — S phase', route: '/cellcycle?phase=S' }, { label: 'Cell Cycle — Anaphase', route: '/cellcycle?phase=anaphase' }],
    levels: {
      beginner: 'Because each new cell needs its own complete copy of the instructions. The cell copies all its DNA first (S phase), so when it splits in two during mitosis, each daughter gets a full set.',
      intermediate: 'In S phase every chromosome is replicated into two identical sister chromatids held together by cohesin. Mitosis is a segregation machine: the spindle attaches the two sisters to opposite poles and pulls them apart. Without prior replication there would be only one chromatid per chromosome and daughters would lose half their genome.',
      advanced: 'Replication licensing (MCM loading) is restricted to G1 and firing to S phase by CDK/DDK activity, ensuring exactly one round per cycle. Cohesion established during replication is essential for bi-orientation: tension across sister kinetochores stabilises correct attachments (Aurora B error correction) and silences the spindle-assembly checkpoint. Only then does APC/C–Cdc20 trigger separase-mediated cohesin cleavage. The G2/M DNA-damage and replication checkpoints (ATR–CHK1 → CDC25 inhibition) prevent mitotic entry with incompletely replicated DNA.',
    },
  },
  {
    match: /(egfr).*(mapk|erk|ras)|(activate).*(mapk)/i,
    evidence: 'established',
    sources: [{ label: 'Signaling — EGFR → MAPK', route: '/signaling?pathway=egfr-mapk' }],
    levels: {
      beginner: 'A growth signal (EGF) sticks to EGFR on the cell surface. EGFR switches on a relay: GRB2 and SOS turn on the RAS switch, and RAS starts a chain of three kinases (RAF → MEK → ERK). ERK enters the nucleus and turns on genes for growth and division.',
      intermediate: 'EGF binding causes EGFR dimerisation and autophosphorylation of tail tyrosines. GRB2 binds these phosphotyrosines via its SH2 domain and brings SOS to the membrane. SOS exchanges GDP for GTP on RAS. RAS-GTP recruits RAF, which phosphorylates MEK1/2; MEK phosphorylates ERK1/2 on Thr and Tyr. Phospho-ERK phosphorylates cytoplasmic targets and nuclear transcription factors (e.g. ELK1), inducing FOS and cyclin D1.',
      advanced: 'Activation proceeds via an asymmetric kinase dimer; pY1068/pY1086 recruit GRB2–SOS (and SHC). SOS is allosterically activated by RAS-GTP (positive feedback). RAS-GTP promotes RAF dimerisation (BRAF–CRAF), relieving autoinhibition; 14-3-3 and membrane lipids stabilise the active state. ERK imposes negative feedback on SOS, RAF and EGFR and induces DUSPs and SPRY. Signal duration/amplitude, not just presence, encodes proliferation vs differentiation (e.g. PC12 cells: EGF transient vs NGF sustained ERK).',
    },
  },
  {
    match: /(glycolysis).*(simpl|easy|explain)|(explain|what is).*(glycolysis)/i,
    evidence: 'established',
    sources: [{ label: 'Metabolism — Glycolysis', route: '/metabolism?pathway=glycolysis' }],
    levels: {
      beginner: 'Glycolysis splits one sugar molecule (glucose, 6 carbons) into two smaller molecules (pyruvate, 3 carbons each). The cell spends 2 ATP to get started and earns 4 ATP back, so it gains 2 ATP, plus 2 NADH (energy-carrying molecules). It happens in the cytoplasm and doesn’t need oxygen.',
      intermediate: 'Ten enzymatic steps. Preparatory phase: hexokinase and PFK-1 each use ATP to phosphorylate the sugar; aldolase splits fructose-1,6-bisphosphate into two trioses. Payoff phase (×2): GAPDH makes NADH, phosphoglycerate kinase and pyruvate kinase make ATP by substrate-level phosphorylation. Net: 2 pyruvate, 2 ATP, 2 NADH. Without oxygen, LDH converts pyruvate to lactate to regenerate NAD⁺.',
      advanced: 'Flux is controlled at the three irreversible steps (HK, PFK-1, PK). PFK-1 integrates energy charge (ATP, AMP) and hormonal state via fructose-2,6-bisphosphate (PFK-2/FBPase-2, regulated by insulin/glucagon via PKA). PK is feed-forward activated by F1,6BP; PKM2 in proliferating cells has low activity, diverting intermediates to biosynthesis (serine, PPP). GAPDH uses a catalytic Cys to form a thioester, coupling aldehyde oxidation to acyl-phosphate formation.',
    },
  },
]

const COMPARE = /(difference|differ|compare|vs\.?|versus)/i
const DEICTIC = /\b(this|it|that|selected|here|these)\b/i

function entityLevels(e: Entity, level: Level): string {
  if (e.levels) return e.levels[level]
  if (level === 'beginner') return `${e.name}: ${e.summary}`
  if (level === 'intermediate') return [e.summary, e.function].filter(Boolean).join(' ')
  return [e.summary, e.function, e.structure && `Structure: ${e.structure}`, e.clinical && `Clinical relevance: ${e.clinical}`].filter(Boolean).join('\n\n')
}

function pathwayLevels(p: Pathway, level: Level): string {
  const chain = (p.steps?.map((s) => s.title.replace(/^\d+ · /, '')) ?? p.nodes.slice(0, 8).map((n) => n.label)).join(' → ')
  if (level === 'beginner') return `${p.name}: ${p.summary.split('. ')[0]}.`
  if (level === 'intermediate') return `${p.summary}\n\nKey steps: ${chain}.${p.net ? `\n\nNet: ${p.net}` : ''}`
  const steps = p.steps?.map((s) => `• ${s.title.replace(/^\d+ · /, '')}: ${s.text}`).join('\n')
  const edges = p.edges
    .filter((e) => e.enzyme)
    .slice(0, 12)
    .map((e) => `• ${p.nodes.find((n) => n.id === e.from)?.label} → ${p.nodes.find((n) => n.id === e.to)?.label}: ${e.enzyme!.name}${e.enzyme!.ec ? ` (EC ${e.enzyme!.ec})` : ''}${e.enzyme!.regulation ? ` — ${e.enzyme!.regulation}` : ''}`)
    .join('\n')
  return [p.summary, steps, edges, p.net && `Net: ${p.net}`, p.clinical && `Clinical relevance: ${p.clinical}`].filter(Boolean).join('\n\n')
}

/** Resolve a context selection into an entity or pathway. */
export function resolveContext(ctx?: TutorContext | null): { entity?: Entity; pathway?: Pathway } {
  if (!ctx) return {}
  if (ENTITY_MAP[ctx.id]) return { entity: ENTITY_MAP[ctx.id] }
  if (PATHWAY_MAP[ctx.id]) return { pathway: PATHWAY_MAP[ctx.id] }
  return {}
}

function findTargets(q: string) {
  // Search each word window so "p53" or "glycolysis" in a sentence is found.
  const words = q.replace(/[?.,!]/g, ' ').split(/\s+/).filter(Boolean)
  const found = new Map<string, { kind: 'entity' | 'pathway'; id: string; score: number }>()
  const stop = new Set(['what', 'is', 'the', 'of', 'a', 'an', 'role', 'does', 'how', 'why', 'explain', 'simply', 'between', 'difference', 'and', 'in', 'cell', 'cells', 'do', 'to', 'it', 'this'])
  for (let n = 3; n >= 1; n--)
    for (let i = 0; i + n <= words.length; i++) {
      const phrase = words.slice(i, i + n).join(' ')
      if (n === 1 && (stop.has(phrase.toLowerCase()) || phrase.length < 2)) continue
      const r = search(phrase, 3)[0]
      // ignore matches that only hit description text
      if (!r || score(phrase, r) < 30) continue
      const id = r.select ?? (r.key.startsWith('p:') ? r.key.slice(2) : undefined)
      if (!id) continue
      const kind = r.key.startsWith('p:') ? 'pathway' : 'entity'
      if (kind === 'entity' && !ENTITY_MAP[id]) continue
      const s = n * 10 + (r.title.toLowerCase() === phrase.toLowerCase() ? 5 : 0)
      if (!found.has(id) || found.get(id)!.score < s) found.set(id, { kind, id, score: s })
    }
  return [...found.values()].sort((a, b) => b.score - a.score)
}

export function answer(question: string, level: Level, ctx?: TutorContext | null): TutorAnswer {
  const q = question.trim()
  const { entity: ctxEntity, pathway: ctxPathway } = resolveContext(ctx)

  for (const f of FAQ) if (f.match.test(q)) return { text: f.levels[level], sources: f.sources, evidence: f.evidence }

  const targets = findTargets(q)
  const deictic = DEICTIC.test(q)

  if (COMPARE.test(q) && targets.length >= 2) {
    const [a, b] = targets.slice(0, 2).map((t) => (t.kind === 'entity' ? ENTITY_MAP[t.id] : PATHWAY_MAP[t.id]))
    const describe = (x: Entity | Pathway) => ('kind' in x ? entityLevels(x as Entity, level) : pathwayLevels(x as Pathway, level))
    return {
      text: `Comparing ${a.name} and ${b.name}:\n\n• ${a.name} — ${describe(a)}\n\n• ${b.name} — ${describe(b)}\n\nOpen each one below to see where it sits in its pathway.`,
      sources: [a, b].map((x) => ('kind' in x ? { label: x.name, route: `/tutor?about=${x.id}` } : { label: x.name, route: routeForPathway(x.id) })),
      evidence: 'established',
    }
  }

  let entity: Entity | undefined
  let pathway: Pathway | undefined
  let usedContext = false
  const top = targets[0]
  if (top && !(deictic && (ctxEntity || ctxPathway))) {
    if (top.kind === 'entity') entity = ENTITY_MAP[top.id]
    else pathway = PATHWAY_MAP[top.id]
  } else if (ctxEntity || ctxPathway) {
    entity = ctxEntity
    pathway = ctxPathway
    usedContext = true
  }

  // Cell-cycle phase questions
  const phase = CELL_CYCLE_PHASES.find((p) => new RegExp(`\\b(${p.id}|${p.short})\\b`, 'i').test(q) && p.id.length > 1)
  if (!entity && !pathway && phase) {
    const text = level === 'beginner' ? phase.summary : level === 'intermediate' ? `${phase.summary}\n\nEvents: ${phase.events.join('; ')}.` : `${phase.summary}\n\nEvents: ${phase.events.join('; ')}.\n\nMolecular mechanism: ${phase.mechanism.join('; ')}.${phase.checkpoint ? `\n\nCheckpoint: ${phase.checkpoint}` : ''}`
    return { text, sources: [{ label: `Cell Cycle — ${phase.name}`, route: `/cellcycle?phase=${phase.id}` }], evidence: phase.evidence }
  }
  const stage = DOGMA_STAGES.find((s) => q.toLowerCase().includes(s.id) || q.toLowerCase().includes(s.name.toLowerCase()))
  if (!entity && !pathway && stage) {
    const text = level === 'beginner' ? stage.summary.split('. ')[0] + '.' : level === 'intermediate' ? stage.summary : `${stage.summary}\n\n${stage.steps.map((s) => `• ${s}`).join('\n')}`
    return { text, sources: [{ label: `DNA → RNA → Protein — ${stage.name}`, route: `/dogma?stage=${stage.id}` }], evidence: stage.evidence }
  }

  if (entity) {
    const paths = PATHWAYS.filter((p) => p.nodes.some((n) => n.ref === entity!.id)).slice(0, 3)
    const role = /role|do|does|function|why/i.test(q)
    let text = entityLevels(entity, level)
    if (role && level !== 'beginner' && paths.length) text += `\n\nIt appears in: ${paths.map((p) => p.name).join(', ')}.`
    if (usedContext) text = `About the selected ${ctx!.kind} — ${entity.name}:\n\n${text}`
    return {
      text,
      sources: [
        ...(entity.kind === 'organelle' ? [{ label: `Cell Explorer — ${entity.name}`, route: `/cell?select=${entity.id}` }] : []),
        ...paths.map((p) => ({ label: p.name, route: routeForPathway(p.id, entity!.id) })),
      ],
      evidence: entity.evidence,
      usedContext,
    }
  }
  if (pathway) {
    let text = pathwayLevels(pathway, level)
    if (usedContext) text = `About the pathway you have open — ${pathway.name}:\n\n${text}`
    return { text, sources: [{ label: pathway.name, route: routeForPathway(pathway.id) }], evidence: pathway.evidence, usedContext }
  }
  const suggestions = ['p53', 'glycolysis', 'mitochondria', 'mTOR', 'caspase-3', 'cyclin B'].join(', ')
  return {
    text: `I couldn’t match that to anything in the BioPath knowledge base, and I only answer from curated content so I don’t invent mechanisms. Try naming a molecule, organelle or pathway (e.g. ${suggestions}), or select an object in a 3D view and ask “what does this do?”. You can also enable Claude mode in settings for open-ended questions.`,
    sources: [],
    evidence: 'established',
  }
}

/** Short grounding text passed to the LLM mode. */
export function groundingFor(question: string, ctx?: TutorContext | null): string {
  const parts: string[] = []
  const { entity, pathway } = resolveContext(ctx)
  if (entity) parts.push(`SELECTED OBJECT: ${entity.name} (${entity.kind}). ${entity.summary} ${entity.function ?? ''}`)
  if (pathway) parts.push(`SELECTED PATHWAY: ${pathway.name}. ${pathway.summary}`)
  for (const t of findTargets(question).slice(0, 4)) {
    const e = ENTITY_MAP[t.id]
    const p = PATHWAY_MAP[t.id]
    if (e) parts.push(`KB ENTRY ${e.name}: ${e.summary} ${e.function ?? ''} ${e.clinical ? 'Clinical: ' + e.clinical : ''}`)
    if (p) parts.push(`KB PATHWAY ${p.name}: ${p.summary}`)
  }
  return parts.join('\n')
}

export const SUGGESTED_QUESTIONS = [
  'What is the role of p53?',
  'Explain glycolysis simply.',
  'Why does DNA replicate before mitosis?',
  'How does EGFR activate MAPK?',
  "What's the difference between apoptosis and necrosis?",
]

export const allEntityNames = () => ENTITIES.map((e) => e.name)
