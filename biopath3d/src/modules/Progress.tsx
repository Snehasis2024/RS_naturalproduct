import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { topicStats, weakTopics, recommendedLesson } from '../engine/progress'
import { LESSONS } from '../data/lessons'
import { navigate } from '../store/router'
import { NAV } from '../components/layout/nav'

const bar = (pct: number) => '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))

export function Progress() {
  const done = useStore((s) => s.lessonsCompleted)
  const attempts = useStore((s) => s.attempts)
  const seconds = useStore((s) => s.studySeconds)
  const visited = useStore((s) => s.visited)
  const reset = useStore((s) => s.resetProgress)
  const stats = useMemo(() => topicStats(done, attempts), [done, attempts])
  const weak = weakTopics(stats)
  const rec = recommendedLesson(done, stats)
  const acc = attempts.length ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100) : null
  const lessonsDone = Object.keys(done).length
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const modules = NAV.filter((n) => visited[n.path])

  return (
    <div className="scroll-thin h-full overflow-y-auto p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Your progress</h1>
        <p className="mt-1 text-sm text-slate-400">Stored privately in this browser. Mastery = 50% lessons completed + 50% recent quiz accuracy in each topic.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ['Lessons completed', `${lessonsDone}/${LESSONS.length}`],
            ['Quiz accuracy', acc === null ? '—' : `${acc}%`],
            ['Questions answered', `${attempts.length}`],
            ['Study time', `${h}h ${m}m`],
          ].map(([k, v]) => (
            <div key={k} className="glass rounded-2xl p-4">
              <div className="section-title">{k}</div>
              <div className="mt-1 text-2xl font-semibold text-white">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass rounded-2xl p-5">
            <div className="section-title mb-3">Mastery by topic</div>
            <div className="space-y-4">
              {stats.map((s) => (
                <div key={s.topic}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-white">{s.label}</span>
                    <span className="font-mono text-sm" style={{ color: s.color }}>{s.mastery}%</span>
                  </div>
                  <div className="font-mono text-lg tracking-tight" style={{ color: s.color }} aria-hidden>{bar(s.mastery)}</div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.mastery}%`, background: s.color }} />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Lessons {s.lessonsDone}/{s.lessonsTotal} · {s.attempts} answers{s.accuracy !== null ? ` · recent accuracy ${Math.round(s.accuracy * 100)}%` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="section-title mb-2">Recommended next</div>
              {rec ? (
                <>
                  <div className="font-semibold text-white">{rec.lesson.title}</div>
                  <p className="mt-1 text-[13px] text-slate-400">{rec.reason}</p>
                  <button className="btn btn-primary mt-3" onClick={() => navigate(`/learn?lesson=${rec.lesson.id}`)}>Start lesson →</button>
                </>
              ) : (
                <p className="text-sm text-slate-300">You have completed every lesson. Try a mixed quiz to keep your knowledge fresh.</p>
              )}
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="section-title mb-2">Weak areas</div>
              {weak.length ? (
                <ul className="space-y-1 text-sm">
                  {weak.map((w) => (
                    <li key={w.topic} className="flex justify-between"><span className="text-rose-200">{w.label}</span><span className="font-mono text-rose-300">{Math.round((w.accuracy ?? 0) * 100)}%</span></li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-slate-400">No weak areas detected yet (needs ≥3 answers in a topic with &lt;70% accuracy).</p>
              )}
              {weak.length > 0 && <button className="btn mt-3" onClick={() => navigate('/quiz')}>🎯 Practise</button>}
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="section-title mb-2">Modules explored</div>
              <div className="flex flex-wrap gap-1.5">
                {modules.length ? modules.map((n) => <span key={n.path} className="chip">{n.icon} {n.label}</span>) : <span className="text-[13px] text-slate-400">None yet</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="glass mt-4 rounded-2xl p-5">
          <div className="section-title mb-2">Lessons</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {LESSONS.map((l) => (
              <button key={l.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-white/5" onClick={() => navigate(`/learn?lesson=${l.id}`)}>
                <span className={done[l.id] ? 'text-emerald-300' : 'text-slate-600'}>{done[l.id] ? '●' : '○'}</span>
                <span className="text-slate-200">{l.title}</span>
                <span className="ml-auto text-[11px] text-slate-500">{l.journey}</span>
              </button>
            ))}
          </div>
        </div>
        <button className="btn mt-6 text-rose-200" onClick={() => confirm('Reset all progress stored in this browser?') && reset()}>Reset progress</button>
      </div>
    </div>
  )
}
