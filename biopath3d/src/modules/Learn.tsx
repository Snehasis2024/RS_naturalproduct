import { useEffect, useMemo, useState } from 'react'
import { LESSONS, JOURNEY } from '../data/lessons'
import type { Lesson, LessonStep } from '../data/schema'
import { questionById } from '../engine/quizGen'
import { useStore } from '../store/useStore'
import { navigate, useRoute } from '../store/router'
import { SceneEmbed } from '../components/SceneEmbed'
import { QuestionView } from '../components/ui/QuestionView'
import { EvidenceBadge } from '../components/ui/Evidence'
import { TOPICS } from '../engine/progress'

const TEACH_ORDER = ['Explain', 'Show 3D', 'Highlight', 'Mechanism', 'Pathway', 'Ask', 'Feedback', 'Continue']

export function Learn() {
  const { params } = useRoute()
  const id = params.get('lesson')
  const lesson = LESSONS.find((l) => l.id === id)
  return lesson ? <LessonPlayer key={lesson.id} lesson={lesson} /> : <LessonList />
}

function LessonList() {
  const done = useStore((s) => s.lessonsCompleted)
  return (
    <div className="scroll-thin h-full overflow-y-auto p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Guided learning</h1>
        <p className="mt-1 max-w-2xl text-slate-400">
          Each lesson teaches in the same rhythm: {TEACH_ORDER.join(' → ')}. 3D scenes are the real simulations — rotate them, click objects, and the info panel follows along.
        </p>
        <div className="mt-6 space-y-6">
          {JOURNEY.map((stage, si) => {
            const ls = LESSONS.filter((l) => l.journey === stage)
            if (!ls.length) return null
            return (
              <div key={stage}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-cyan-300">STAGE {si + 1}</span>
                  <span className="text-sm font-semibold text-white">{stage}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ls.map((l) => {
                    const topic = TOPICS.find((t) => t.id === l.topic)!
                    return (
                      <button key={l.id} onClick={() => navigate(`/learn?lesson=${l.id}`)} className={`glass rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/50 ${done[l.id] ? 'border-emerald-400/40' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="chip" style={{ borderColor: topic.color + '66', color: topic.color }}>{topic.label}</span>
                          <span className="text-[11px] text-slate-400">{l.minutes} min · {l.steps.length} steps</span>
                          {done[l.id] && <span className="ml-auto text-[11px] text-emerald-300">✓ completed</span>}
                        </div>
                        <div className="mt-2 font-semibold text-white">{l.title}</div>
                        {l.hook && <div className="mt-1 text-[13px] text-cyan-100/80 italic">“{l.hook}”</div>}
                        <ul className="mt-2 space-y-0.5 text-[12px] text-slate-400">
                          {l.objectives.map((o) => <li key={o}>• {o}</li>)}
                        </ul>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [i, setI] = useState(0)
  const [answered, setAnswered] = useState<Record<number, boolean>>({})
  const [finished, setFinished] = useState(false)
  const record = useStore((s) => s.recordAttempt)
  const complete = useStore((s) => s.completeLesson)
  const select = useStore((s) => s.select)
  const step = lesson.steps[i]
  const next = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1]
  const canContinue = step.kind !== 'question' || answered[i] !== undefined

  useEffect(() => {
    if (step.kind !== 'scene' || (step.scene.type !== 'cell' && step.scene.type !== 'molecule')) select(null)
  }, [i, step, select])

  const go = (d: number) => {
    const n = i + d
    if (n >= lesson.steps.length) {
      complete(lesson.id)
      setFinished(true)
      return
    }
    setI(Math.max(0, n))
  }

  if (finished) {
    const correct = Object.values(answered).filter(Boolean).length
    const total = Object.keys(answered).length
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="glass max-w-lg rounded-3xl p-8 text-center">
          <div className="text-5xl">🎓</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Lesson complete</h2>
          <p className="mt-1 text-slate-300">{lesson.title}</p>
          {total > 0 && <p className="mt-3 text-sm text-slate-400">In-lesson questions: <b className="text-cyan-200">{correct}/{total}</b> correct</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary" onClick={() => navigate(`/quiz?lesson=${lesson.id}`)}>📝 Take the lesson quiz</button>
            {next && <button className="btn" onClick={() => navigate(`/learn?lesson=${next.id}`)}>Next: {next.title} →</button>}
            <button className="btn" onClick={() => navigate('/learn')}>All lessons</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <button className="btn px-2 py-1 text-xs" onClick={() => navigate('/learn')}>← Lessons</button>
        <div className="min-w-0">
          <div className="text-[10px] tracking-widest text-cyan-300 uppercase">{lesson.journey}</div>
          <div className="truncate text-sm font-semibold text-white">{lesson.title}</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {lesson.steps.map((s, k) => (
            <button key={k} onClick={() => k <= i && setI(k)} title={stepLabel(s)} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-cyan-400' : k < i ? 'w-3 bg-cyan-400/50' : 'w-3 bg-white/15'}`} />
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {step.kind === 'scene' && (
          <div className="relative min-h-[45vh] flex-1 lg:min-h-0">
            <SceneEmbed scene={step.scene} />
          </div>
        )}
        <div className={`scroll-thin overflow-y-auto p-5 ${step.kind === 'scene' ? 'lg:w-[380px] lg:border-l lg:border-white/10' : 'mx-auto w-full max-w-3xl flex-1'}`}>
          <div className="mb-2 text-[10px] font-semibold tracking-widest text-violet-300 uppercase">
            Step {i + 1} of {lesson.steps.length} · {stepLabel(step)}
          </div>
          <StepBody step={step} lesson={lesson} i={i} onAnswered={(ok, qid, topic) => { setAnswered((a) => ({ ...a, [i]: ok })); record({ qid, topic, correct: ok }) }} />
          <div className="mt-6 flex gap-2">
            <button className="btn" disabled={i === 0} onClick={() => go(-1)}>← Back</button>
            <button className="btn btn-primary" disabled={!canContinue} onClick={() => go(1)}>
              {i === lesson.steps.length - 1 ? 'Finish lesson' : 'Continue →'}
            </button>
            {!canContinue && <span className="self-center text-[11px] text-slate-400">Answer to continue</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function stepLabel(s: LessonStep) {
  return { explain: 'Concept', scene: '3D demonstration', mechanism: 'Mechanism', question: 'Check your understanding' }[s.kind]
}

function StepBody({ step, lesson, i, onAnswered }: { step: LessonStep; lesson: Lesson; i: number; onAnswered: (ok: boolean, qid: string, topic: Lesson['topic']) => void }) {
  const [revealed, setRevealed] = useState(0)
  const points = step.kind === 'mechanism' ? step.points : []
  useEffect(() => {
    setRevealed(0)
    if (step.kind !== 'mechanism') return
    const id = setInterval(() => setRevealed((r) => (r >= points.length ? r : r + 1)), 700)
    return () => clearInterval(id)
  }, [step, points.length])
  const q = useMemo(() => (step.kind === 'question' ? questionById(step.questionId) : undefined), [step])

  if (step.kind === 'explain')
    return (
      <div>
        {i === 0 && lesson.hook && <p className="mb-4 rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-3 text-lg text-cyan-50 italic">“{lesson.hook}”</p>}
        <h2 className="text-2xl font-semibold text-white">{step.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-300">{step.text}</p>
        {step.evidence && <div className="mt-3"><EvidenceBadge level={step.evidence} /></div>}
        {i === 0 && (
          <div className="mt-5">
            <div className="section-title mb-1">You will learn to</div>
            <ul className="space-y-1 text-sm text-slate-300">{lesson.objectives.map((o) => <li key={o}>✓ {o}</li>)}</ul>
          </div>
        )}
      </div>
    )
  if (step.kind === 'scene')
    return (
      <div>
        <h2 className="text-xl font-semibold text-white">{step.title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-300">{step.text}</p>
        <p className="mt-3 text-[11px] text-slate-500">Interact: drag to rotate, scroll to zoom, click objects for details.</p>
      </div>
    )
  if (step.kind === 'mechanism')
    return (
      <div>
        <h2 className="text-xl font-semibold text-white">{step.title}</h2>
        <ol className="mt-4 space-y-1">
          {points.map((p, k) => (
            <li key={p} className={`transition-all duration-500 ${k < revealed ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`}>
              <div className="glass rounded-xl px-3 py-2 text-[14px] text-slate-100">{p}</div>
              {k < points.length - 1 && <div className="py-0.5 pl-5 text-cyan-400">↓</div>}
            </li>
          ))}
        </ol>
        {step.evidence && <div className="mt-3"><EvidenceBadge level={step.evidence} /></div>}
      </div>
    )
  if (!q) return <p className="text-rose-300">Missing question {step.questionId}</p>
  return <QuestionView key={q.id} q={q} onAnswered={(ok) => onAnswered(ok, q.id, q.topic)} />
}
