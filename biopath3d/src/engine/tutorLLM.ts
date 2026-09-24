/**
 * Optional Claude-backed tutor. The student supplies their own Anthropic API
 * key (stored only in this browser). The request is grounded with the BioPath
 * knowledge-base entries and the currently selected 3D object.
 */
import type { Level, TutorContext } from './tutor'
import { groundingFor } from './tutor'

export const TUTOR_MODEL = 'claude-opus-5'

const SYSTEM = `You are BioTutor, a biology tutor inside BioPath 3D, an interactive 3D molecular and cell biology app for university students.
Rules:
- Explain at the requested level (BEGINNER: plain language, analogies, no jargon; INTERMEDIATE: undergraduate textbook detail with correct molecule names; ADVANCED: mechanistic detail, regulation, current understanding, caveats).
- Be scientifically accurate. Never invent mechanisms. If something is uncertain, debated or simplified, say so explicitly.
- When the student has an object selected in the 3D view, relate your answer to it.
- Prefer the provided knowledge-base context; you may add well-established textbook knowledge.
- Keep answers focused (under ~250 words unless ADVANCED needs more). Use short paragraphs or bullet points. Plain text, no markdown headings.`

export async function askClaude(opts: {
  apiKey: string
  question: string
  level: Level
  context?: TutorContext | null
  history: { role: 'user' | 'assistant'; content: string }[]
  onText: (delta: string) => void
  signal?: AbortSignal
}): Promise<void> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true })
  const grounding = groundingFor(opts.question, opts.context)
  const ctxLine = opts.context ? `The student currently has selected: ${opts.context.label} (${opts.context.kind}).` : 'No object is selected.'
  const stream = client.beta.messages.stream(
    {
      model: TUTOR_MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: SYSTEM,
      messages: [
        ...opts.history.slice(-8),
        {
          role: 'user',
          content: `LEVEL: ${opts.level.toUpperCase()}\n${ctxLine}\n\nKnowledge-base context:\n${grounding || '(none matched)'}\n\nQuestion: ${opts.question}`,
        },
      ],
    },
    { signal: opts.signal },
  )
  stream.on('text', (t) => opts.onText(t))
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') opts.onText('\n\n(The model declined to answer this request.)')
}
