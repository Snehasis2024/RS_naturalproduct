import { useMemo, useState } from 'react'
import type { Question } from '../../data/schema'
import { rng, shuffle } from '../../engine/quizGen'
import { Icon } from './Icon'
import { SceneShell } from '../three/SceneShell'
import { CellModel } from '../three/cell/CellModel'

/** Renders any question type, checks the answer and shows the explanation. */
export function QuestionView({
  q,
  onAnswered,
  compact,
}: {
  q: Question
  onAnswered?: (correct: boolean) => void
  compact?: boolean
}) {
  const [done, setDone] = useState<null | boolean>(null)
  const finish = (ok: boolean) => {
    if (done !== null) return
    setDone(ok)
    onAnswered?.(ok)
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="chip shrink-0 uppercase tracking-wider">{labelFor(q.type)}</span>
        <p className={`${compact ? 'text-sm' : 'text-base'} font-medium text-slate-100`}>{q.prompt}</p>
      </div>
      {q.type === 'identify' && (
        <div className="relative h-56 overflow-hidden rounded-xl border border-white/10 sm:h-64">
          <SceneShell camera={[0, 2, 12]} dust={false} autoRotate>
            <CellModel highlight={q.organelle} labels={false} interactive={false} traffic={false} />
          </SceneShell>
          <span className="absolute bottom-2 left-2 text-[10px] text-slate-400">Drag to rotate · scroll to zoom</span>
        </div>
      )}
      {(q.type === 'mcq' || q.type === 'mechanism' || q.type === 'identify') && <Choice q={q} done={done} onFinish={finish} />}
      {q.type === 'order' && <Order q={q} done={done} onFinish={finish} />}
      {q.type === 'match' && <Match q={q} done={done} onFinish={finish} />}
      {done !== null && (
        <div className={`rounded-xl border p-3 text-sm ${done ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-rose-400/40 bg-rose-400/10'}`}>
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <Icon name={done ? 'check' : 'x'} className="h-4 w-4" />
            {done ? 'Correct' : 'Not quite'}
          </div>
          <p className="text-slate-200">{q.explanation}</p>
        </div>
      )}
    </div>
  )
}

function labelFor(t: Question['type']) {
  return { mcq: 'MCQ', mechanism: 'Mechanism', order: 'Order', match: 'Match', identify: 'Identify' }[t]
}

function Choice({ q, done, onFinish }: { q: Extract<Question, { options: string[] }>; done: boolean | null; onFinish: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {q.options.map((o, i) => {
        const state = done === null ? '' : i === q.answer ? 'border-emerald-400/70 bg-emerald-400/15' : i === picked ? 'border-rose-400/70 bg-rose-400/15' : 'opacity-60'
        return (
          <button
            key={i}
            disabled={done !== null}
            onClick={() => {
              setPicked(i)
              onFinish(i === q.answer)
            }}
            className={`rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm transition hover:border-cyan-400/50 hover:bg-cyan-400/10 ${state}`}
          >
            <span className="mr-2 font-mono text-xs text-cyan-300">{String.fromCharCode(65 + i)}</span>
            {o}
          </button>
        )
      })}
    </div>
  )
}

function Order({ q, done, onFinish }: { q: Extract<Question, { type: 'order' }>; done: boolean | null; onFinish: (ok: boolean) => void }) {
  const initial = useMemo(() => {
    const r = rng(q.id.length * 97 + q.items.length)
    let s = shuffle(q.items, r)
    if (s.every((x, i) => x === q.items[i])) s = [...s.slice(1), s[0]]
    return s
  }, [q])
  const [list, setList] = useState(initial)
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const n = [...list]
    ;[n[i], n[j]] = [n[j], n[i]]
    setList(n)
  }
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {list.map((item, i) => {
          const ok = done !== null && item === q.items[i]
          const bad = done !== null && item !== q.items[i]
          return (
            <li key={item} className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm ${ok ? 'border-emerald-400/60' : ''} ${bad ? 'border-rose-400/60' : ''}`}>
              <span className="w-5 font-mono text-xs text-cyan-300">{i + 1}</span>
              <span className="flex-1">{item}</span>
              {done === null && (
                <span className="flex gap-1">
                  <button className="btn px-2 py-0.5" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button className="btn px-2 py-0.5" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === list.length - 1}>↓</button>
                </span>
              )}
              {bad && <span className="text-xs text-rose-300">→ {q.items.indexOf(item) + 1}</span>}
            </li>
          )
        })}
      </ol>
      {done === null && (
        <button className="btn btn-primary" onClick={() => onFinish(list.every((x, i) => x === q.items[i]))}>
          Check order
        </button>
      )}
    </div>
  )
}

function Match({ q, done, onFinish }: { q: Extract<Question, { type: 'match' }>; done: boolean | null; onFinish: (ok: boolean) => void }) {
  const rights = useMemo(() => shuffle(q.pairs.map((p) => p[1]), rng(q.id.length * 31 + 7)), [q])
  const [assign, setAssign] = useState<Record<number, string>>({})
  const complete = q.pairs.every((_, i) => assign[i])
  return (
    <div className="space-y-2">
      {q.pairs.map(([left, right], i) => {
        const val = assign[i] ?? ''
        const cls = done === null ? '' : val === right ? 'border-emerald-400/60' : 'border-rose-400/60'
        return (
          <div key={left} className={`grid items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-sm sm:grid-cols-2 ${cls}`}>
            <span className="font-medium">{left}</span>
            <select
              disabled={done !== null}
              value={val}
              onChange={(e) => setAssign({ ...assign, [i]: e.target.value })}
              className="rounded-md border border-white/15 bg-slate-900/80 px-2 py-1 text-sm"
            >
              <option value="">Select…</option>
              {rights.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {done !== null && val !== right && <span className="text-xs text-emerald-300 sm:col-span-2">Correct: {right}</span>}
          </div>
        )
      })}
      {done === null && (
        <button className="btn btn-primary" disabled={!complete} onClick={() => onFinish(q.pairs.every(([, r], i) => assign[i] === r))}>
          Check matches
        </button>
      )}
    </div>
  )
}
