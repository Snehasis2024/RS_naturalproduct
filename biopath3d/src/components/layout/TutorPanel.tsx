import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { answer, SUGGESTED_QUESTIONS, type Level, type TutorSource } from '../../engine/tutor'
import { askClaude, TUTOR_MODEL } from '../../engine/tutorLLM'
import { navigate } from '../../store/router'
import { EvidenceBadge } from '../ui/Evidence'
import { Icon } from '../ui/Icon'
import type { Evidence } from '../../data/schema'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  level?: Level
  sources?: TutorSource[]
  evidence?: Evidence
  mode?: 'offline' | 'claude'
  context?: string
}

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced']

/** BioTutor: explains at three levels and uses the currently selected 3D object as context. */
export function TutorPanel({ embedded }: { embedded?: boolean }) {
  const open = useStore((s) => s.tutorOpen)
  const setOpen = useStore((s) => s.setTutorOpen)
  const selection = useStore((s) => s.selection)
  const level = useStore((s) => s.level)
  const setLevel = useStore((s) => s.setLevel)
  const mode = useStore((s) => s.tutorMode)
  const setMode = useStore((s) => s.setTutorMode)
  const apiKey = useStore((s) => s.apiKey)
  const setApiKey = useStore((s) => s.setApiKey)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: 'Hi, I’m BioTutor. Ask me about any molecule, organelle or pathway. Select something in a 3D view and I’ll use it as context. Choose Beginner, Intermediate or Advanced explanations.', mode: 'offline' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  if (!open && !embedded) return null

  const ctx = selection ? { kind: selection.kind.replace('-', ' '), id: selection.id, label: selection.label } : null

  const ask = async (question: string, lvl: Level = level) => {
    if (!question.trim() || busy) return
    setInput('')
    const userMsg: Msg = { role: 'user', text: question, context: ctx?.label }
    if (mode === 'claude' && apiKey) {
      setBusy(true)
      const history = msgs.filter((m) => m.role === 'user' || m.mode === 'claude').map((m) => ({ role: m.role, content: m.text }))
      setMsgs((m) => [...m, userMsg, { role: 'assistant', text: '', level: lvl, mode: 'claude' }])
      const ac = new AbortController()
      abortRef.current = ac
      try {
        await askClaude({
          apiKey,
          question,
          level: lvl,
          context: ctx,
          history,
          signal: ac.signal,
          onText: (d) => setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, text: x.text + d } : x))),
        })
      } catch (err) {
        const fallback = answer(question, lvl, ctx)
        setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, text: `(Claude request failed: ${(err as Error).message}. Showing the offline answer.)\n\n${fallback.text}`, sources: fallback.sources, evidence: fallback.evidence, mode: 'offline' } : x)))
      } finally {
        setBusy(false)
      }
      return
    }
    const a = answer(question, lvl, ctx)
    setMsgs((m) => [...m, userMsg, { role: 'assistant', text: a.text, level: lvl, sources: a.sources, evidence: a.evidence, mode: 'offline' }])
  }

  const lastUser = [...msgs].reverse().find((m) => m.role === 'user')

  return (
    <aside
      className={
        embedded
          ? 'flex h-full flex-col'
          : 'glass-strong fixed inset-2 z-50 flex flex-col rounded-2xl shadow-2xl sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(640px,80vh)] sm:w-[420px]'
      }
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="text-lg">🤖</span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">BioTutor</div>
          <div className="text-[10px] text-slate-400">
            {mode === 'claude' && apiKey ? `Claude mode (${TUTOR_MODEL})` : 'Offline mode — answers from the curated knowledge base'}
          </div>
        </div>
        <button className="btn px-2 py-1 text-xs" onClick={() => setSettings(!settings)}>
          ⚙
        </button>
        {!embedded && (
          <button className="btn px-2 py-1" onClick={() => setOpen(false)} aria-label="Close tutor">
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {settings && (
        <div className="space-y-2 border-b border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-300">
          <div className="flex gap-1.5">
            <button className={`btn ${mode === 'offline' ? 'btn-active' : ''}`} onClick={() => setMode('offline')}>
              Offline (curated)
            </button>
            <button className={`btn ${mode === 'claude' ? 'btn-active' : ''}`} onClick={() => setMode('claude')}>
              Claude (API key)
            </button>
          </div>
          {mode === 'claude' && (
            <>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value.trim())}
                placeholder="sk-ant-… (stored only in this browser)"
                className="w-full rounded-md border border-white/15 bg-slate-900/80 px-2 py-1.5"
              />
              <p className="text-[10px] text-slate-500">
                Your key is sent directly from this browser to api.anthropic.com and stored in localStorage on this device. Answers are grounded with BioPath’s knowledge base and your current selection, but you should still verify them. Use a key with a spending limit.
              </p>
            </>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="flex flex-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLevel(l)
                if (lastUser && !busy) ask(lastUser.text, l)
              }}
              className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide uppercase ${level === l ? 'bg-cyan-400/20 text-cyan-100' : 'text-slate-400 hover:text-white'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {ctx && (
        <div className="mx-4 mt-2 rounded-lg border border-violet-400/25 bg-violet-400/10 px-2.5 py-1.5 text-[11px] text-violet-100">
          Context: <b>{ctx.label}</b> <span className="text-violet-300/70">({ctx.kind})</span> — ask “what does this do?”
        </div>
      )}
      <div ref={scroller} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`max-w-[92%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-cyan-500/20 text-cyan-50' : 'border border-white/10 bg-white/[0.04] text-slate-200'}`}>
              {m.role === 'assistant' && m.level && <div className="mb-1 text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">{m.level}</div>}
              <div className="whitespace-pre-line">{m.text || (busy ? '…' : '')}</div>
              {(m.evidence || m.sources?.length) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
                  {m.evidence && <EvidenceBadge level={m.evidence} compact />}
                  {m.sources?.map((s) => (
                    <button key={s.route + s.label} className="chip" onClick={() => navigate(s.route)}>
                      ↗ {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {msgs.length < 3 && (
          <div className="space-y-1.5">
            {SUGGESTED_QUESTIONS.map((s) => (
              <button key={s} className="block w-full rounded-lg border border-white/10 px-3 py-1.5 text-left text-xs text-slate-300 hover:border-cyan-400/50 hover:bg-cyan-400/5" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-white/10 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={ctx ? `Ask about ${ctx.label}…` : 'Ask a biology question…'}
          className="flex-1 rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm focus:border-cyan-400/60 focus:outline-none"
          aria-label="Ask BioTutor"
        />
        {busy ? (
          <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        ) : (
          <button className="btn btn-primary" type="submit" aria-label="Send">
            <Icon name="send" />
          </button>
        )}
      </form>
    </aside>
  )
}
