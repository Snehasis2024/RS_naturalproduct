import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Topic } from '../data/schema'
import type { Level } from '../engine/tutor'

export interface Selection {
  kind: 'organelle' | 'protein' | 'pathway-node' | 'structure' | 'molecule' | 'phase' | 'pathway' | 'metabolite' | 'reaction'
  /** Entity id (knowledge base) when one exists; otherwise a free id. */
  id: string
  label: string
  /** Extra payload the info panel can render (pathway node description, reaction, etc.). */
  detail?: Record<string, unknown>
}

export interface QuizAttempt {
  qid: string
  topic: Topic
  correct: boolean
  ts: number
}

interface State {
  // ui
  selection: Selection | null
  select: (s: Selection | null) => void
  rightOpen: boolean
  setRightOpen: (v: boolean) => void
  tutorOpen: boolean
  setTutorOpen: (v: boolean) => void
  navOpen: boolean
  setNavOpen: (v: boolean) => void
  // settings (persisted)
  showLabels: boolean
  setShowLabels: (v: boolean) => void
  level: Level
  setLevel: (l: Level) => void
  tutorMode: 'offline' | 'claude'
  setTutorMode: (m: 'offline' | 'claude') => void
  apiKey: string
  setApiKey: (k: string) => void
  // progress (persisted)
  lessonsCompleted: Record<string, number>
  completeLesson: (id: string) => void
  attempts: QuizAttempt[]
  recordAttempt: (a: Omit<QuizAttempt, 'ts'>) => void
  studySeconds: number
  addStudyTime: (s: number) => void
  visited: Record<string, number>
  visit: (module: string) => void
  resetProgress: () => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      selection: null,
      select: (selection) => set(selection ? { selection, rightOpen: true } : { selection }),
      rightOpen: true,
      setRightOpen: (rightOpen) => set({ rightOpen }),
      tutorOpen: false,
      setTutorOpen: (tutorOpen) => set({ tutorOpen }),
      navOpen: false,
      setNavOpen: (navOpen) => set({ navOpen }),
      showLabels: true,
      setShowLabels: (showLabels) => set({ showLabels }),
      level: 'intermediate',
      setLevel: (level) => set({ level }),
      tutorMode: 'offline',
      setTutorMode: (tutorMode) => set({ tutorMode }),
      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),
      lessonsCompleted: {},
      completeLesson: (id) => set((s) => ({ lessonsCompleted: { ...s.lessonsCompleted, [id]: Date.now() } })),
      attempts: [],
      recordAttempt: (a) => set((s) => ({ attempts: [...s.attempts, { ...a, ts: Date.now() }].slice(-2000) })),
      studySeconds: 0,
      addStudyTime: (sec) => set((s) => ({ studySeconds: s.studySeconds + sec })),
      visited: {},
      visit: (m) => set((s) => ({ visited: { ...s.visited, [m]: (s.visited[m] ?? 0) + 1 } })),
      resetProgress: () => set({ lessonsCompleted: {}, attempts: [], studySeconds: 0, visited: {} }),
    }),
    {
      name: 'biopath3d',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          const k = '__bp_test'
          localStorage.setItem(k, '1')
          localStorage.removeItem(k)
          return localStorage
        } catch {
          const mem = new Map<string, string>()
          return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) }
        }
      }),
      partialize: (s) => ({
        showLabels: s.showLabels,
        level: s.level,
        tutorMode: s.tutorMode,
        apiKey: s.apiKey,
        lessonsCompleted: s.lessonsCompleted,
        attempts: s.attempts,
        studySeconds: s.studySeconds,
        visited: s.visited,
      }),
    },
  ),
)
