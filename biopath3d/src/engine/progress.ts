import type { Topic } from '../data/schema'
import { LESSONS } from '../data/lessons'
import type { QuizAttempt } from '../store/useStore'

export const TOPICS: { id: Topic; label: string; color: string }[] = [
  { id: 'cell-biology', label: 'Cell Biology', color: '#22d3ee' },
  { id: 'molecular-biology', label: 'Molecular Biology', color: '#a78bfa' },
  { id: 'signaling', label: 'Cell Signaling', color: '#f472b6' },
  { id: 'metabolism', label: 'Metabolism', color: '#fbbf24' },
  { id: 'pathways', label: 'Pathways', color: '#34d399' },
]

export interface TopicStats {
  topic: Topic
  label: string
  color: string
  lessonsDone: number
  lessonsTotal: number
  attempts: number
  correct: number
  accuracy: number | null
  mastery: number
}

/**
 * Mastery = 50% lesson completion + 50% recent quiz accuracy (last 20 answers in
 * the topic), with quiz evidence weighted by how many answers exist (≥10 = full weight).
 */
export function topicStats(done: Record<string, number>, attempts: QuizAttempt[]): TopicStats[] {
  return TOPICS.map((t) => {
    const lessons = LESSONS.filter((l) => l.topic === t.id)
    const lessonsDone = lessons.filter((l) => done[l.id]).length
    const recent = attempts.filter((a) => a.topic === t.id).slice(-20)
    const correct = recent.filter((a) => a.correct).length
    const accuracy = recent.length ? correct / recent.length : null
    const lessonPart = lessons.length ? lessonsDone / lessons.length : 0
    const quizPart = accuracy === null ? 0 : accuracy * Math.min(1, recent.length / 10)
    return {
      topic: t.id, label: t.label, color: t.color, lessonsDone, lessonsTotal: lessons.length,
      attempts: attempts.filter((a) => a.topic === t.id).length, correct, accuracy,
      mastery: Math.round((lessonPart * 0.5 + quizPart * 0.5) * 100),
    }
  })
}

export function weakTopics(stats: TopicStats[]) {
  return stats.filter((s) => s.attempts >= 3 && (s.accuracy ?? 1) < 0.7).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
}

export function recommendedLesson(done: Record<string, number>, stats: TopicStats[]) {
  const weak = weakTopics(stats)
  if (weak.length) {
    const l = LESSONS.find((x) => x.topic === weak[0].topic && !done[x.id]) ?? LESSONS.find((x) => x.topic === weak[0].topic)
    if (l) return { lesson: l, reason: `Your accuracy in ${weak[0].label} is ${Math.round((weak[0].accuracy ?? 0) * 100)}% — revisit this lesson.` }
  }
  const next = LESSONS.find((l) => !done[l.id])
  if (next) return { lesson: next, reason: `Next step on the journey: ${next.journey}.` }
  return null
}
