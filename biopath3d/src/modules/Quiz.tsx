import { useMemo, useState } from 'react'
import type { Question, Topic } from '../data/schema'
import { buildQuiz, allQuestions } from '../engine/quizGen'
import { TOPICS, topicStats, weakTopics } from '../engine/progress'
import { LESSONS } from '../data/lessons'
import { useStore } from '../store/useStore'
import { useRoute, navigate } from '../store/router'
import { QuestionView } from '../components/ui/QuestionView'

const TYPES: { id: Question['type'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'mcq', label: 'Multiple choice' },
  { id: 'identify', label: 'Identify the organelle (3D)' },
  { id: 'order', label: 'Pathway ordering' },
  { id: 'match', label: 'Match the molecule' },
  { id: 'mechanism', label: 'Mechanism' },
]

export function Quiz() {
  const { params } = useRoute()
  const lessonId = params.get('lesson')
  const lesson = LESSONS.find((l) => l.id === lessonId)
  const done = useStore((s) => s.lessonsCompleted)
  const attempts = useStore((s) => s.attempts)
  const record = useStore((s) => s.recordAttempt)
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [type, setType] = useState<Question['type'] | 'all'>('all')
  const [count, setCount] = useState(10)
  const [quiz, setQuiz] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const weak = useMemo(() => weakTopics(topicStats(done, attempts)), [done, attempts])
  const poolSize = allQuestions().length

  const start = (opts?: { weak?: boolean; lesson?: boolean }) => {
    const q = buildQuiz({
      topic: opts?.weak ? 'all' : topic,
      type,
      count,
      tags: opts?.lesson && lesson ? lesson.tags : undefined,
      prefer: opts?.weak ? weak.map((w) => w.topic) : undefined,
      seed: Date.now(),
    })
    setQuiz(q)
    setIdx(0)
    setResults({})
  }

  if (!quiz)
    return (
      <div className="scroll-thin h-full overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Quiz lab</h1>
          <p className="mt-1 text-slate-400">{poolSize} questions — hand-written plus questions generated automatically from the pathway and organelle data (so new JSON pathways create new questions).</p>
          {lesson && (
            <div className="glass mt-5 rounded-2xl p-4">
              <div className="section-title">After the lesson</div>
              <div className="mt-1 font-semibold text-white">{lesson.title}</div>
              <button className="btn btn-primary mt-3" onClick={() => start({ lesson: true })}>Start lesson quiz</button>
            </div>
          )}
          <div className="glass mt-5 space-y-4 rounded-2xl p-4">
            <div>
              <div className="section-title mb-2">Topic</div>
              <div className="flex flex-wrap gap-1.5">
                <button className={`btn ${topic === 'all' ? 'btn-active' : ''}`} onClick={() => setTopic('all')}>All topics</button>
                {TOPICS.map((t) => (
                  <button key={t.id} className={`btn ${topic === t.id ? 'btn-active' : ''}`} onClick={() => setTopic(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="section-title mb-2">Question type</div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button key={t.id} className={`btn ${type === t.id ? 'btn-active' : ''}`} onClick={() => setType(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="section-title mb-2">Length</div>
              <div className="flex gap-1.5">
                {[5, 10, 15, 20].map((n) => (
                  <button key={n} className={`btn ${count === n ? 'btn-active' : ''}`} onClick={() => setCount(n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn btn-primary" onClick={() => start()}>Start quiz</button>
              <button className="btn" disabled={!weak.length} onClick={() => start({ weak: true })} title={weak.length ? '' : 'Answer a few questions first'}>
                🎯 Practise weak areas{weak.length ? ` (${weak.map((w) => w.label).join(', ')})` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    )

  if (!quiz.length)
    return (
      <div className="grid h-full place-items-center text-slate-300">
        <div className="text-center">
          No questions match those filters.
          <div className="mt-3"><button className="btn" onClick={() => setQuiz(null)}>Back</button></div>
        </div>
      </div>
    )

  const finished = idx >= quiz.length
  const score = Object.values(results).filter(Boolean).length

  if (finished) {
    const byTopic = TOPICS.map((t) => {
      const qs = quiz.filter((q) => q.topic === t.id)
      return { ...t, n: qs.length, ok: qs.filter((q) => results[q.id]).length }
    }).filter((t) => t.n)
    return (
      <div className="scroll-thin h-full overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="glass rounded-3xl p-6 text-center">
            <div className="text-5xl font-semibold text-white">{Math.round((score / quiz.length) * 100)}%</div>
            <div className="mt-1 text-slate-400">{score} of {quiz.length} correct</div>
            <div className="mx-auto mt-4 max-w-sm space-y-1.5">
              {byTopic.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-[12px]">
                  <span className="w-32 text-left text-slate-300">{t.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full" style={{ width: `${(t.ok / t.n) * 100}%`, background: t.color }} /></div>
                  <span className="w-10 font-mono text-slate-400">{t.ok}/{t.n}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button className="btn btn-primary" onClick={() => start()}>New quiz</button>
              <button className="btn" onClick={() => setQuiz(null)}>Change settings</button>
              <button className="btn" onClick={() => navigate('/progress')}>📊 View progress</button>
            </div>
          </div>
          <h3 className="section-title mt-6 mb-2">Review</h3>
          <ul className="space-y-2">
            {quiz.map((q) => (
              <li key={q.id} className="glass rounded-xl p-3 text-[13px]">
                <span className={results[q.id] ? 'text-emerald-300' : 'text-rose-300'}>{results[q.id] ? '✓' : '✗'}</span> <span className="text-slate-200">{q.prompt}</span>
                <p className="mt-1 text-[12px] text-slate-400">{q.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const q = quiz[idx]
  return (
    <div className="scroll-thin h-full overflow-y-auto p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center gap-3">
          <button className="btn px-2 py-1 text-xs" onClick={() => setQuiz(null)}>✕ Quit</button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${(idx / quiz.length) * 100}%` }} />
          </div>
          <span className="font-mono text-xs text-slate-400">{idx + 1}/{quiz.length} · score {score}</span>
        </div>
        <div className="glass rounded-2xl p-5">
          <QuestionView key={q.id} q={q} onAnswered={(ok) => { setResults((r) => ({ ...r, [q.id]: ok })); record({ qid: q.id, topic: q.topic, correct: ok }) }} />
          {results[q.id] !== undefined && (
            <button className="btn btn-primary mt-4" onClick={() => setIdx(idx + 1)}>
              {idx === quiz.length - 1 ? 'See results' : 'Next question →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
