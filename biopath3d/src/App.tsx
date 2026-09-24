import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { InfoPanel } from './components/layout/InfoPanel'
import { TutorPanel } from './components/layout/TutorPanel'
import { useRoute } from './store/router'
import { useStore } from './store/useStore'

const Home = lazy(() => import('./modules/Home').then((m) => ({ default: m.Home })))
const CellExplorer = lazy(() => import('./modules/CellExplorer').then((m) => ({ default: m.CellExplorer })))
const CellCycle = lazy(() => import('./modules/CellCycle').then((m) => ({ default: m.CellCycle })))
const PathwayLab = lazy(() => import('./modules/PathwayLab').then((m) => ({ default: m.PathwayLab })))
const Metabolism = lazy(() => import('./modules/Metabolism').then((m) => ({ default: m.Metabolism })))
const Apoptosis = lazy(() => import('./modules/Apoptosis').then((m) => ({ default: m.Apoptosis })))
const CentralDogma = lazy(() => import('./modules/CentralDogma').then((m) => ({ default: m.CentralDogma })))
const MolecularViewer = lazy(() => import('./modules/MolecularViewer').then((m) => ({ default: m.MolecularViewer })))
const Learn = lazy(() => import('./modules/Learn').then((m) => ({ default: m.Learn })))
const Quiz = lazy(() => import('./modules/Quiz').then((m) => ({ default: m.Quiz })))
const Progress = lazy(() => import('./modules/Progress').then((m) => ({ default: m.Progress })))
const Universe = lazy(() => import('./modules/Universe').then((m) => ({ default: m.Universe })))
const TutorPage = lazy(() => import('./modules/TutorPage').then((m) => ({ default: m.TutorPage })))

function Module({ path }: { path: string }) {
  switch (path) {
    case '/':
      return <Home />
    case '/universe':
      return <Universe />
    case '/cell':
      return <CellExplorer />
    case '/cellcycle':
      return <CellCycle />
    case '/regulation':
      return <PathwayLab category="regulation" />
    case '/signaling':
      return <PathwayLab category="signaling" />
    case '/map':
      return <PathwayLab category="map" />
    case '/metabolism':
      return <Metabolism />
    case '/apoptosis':
      return <Apoptosis />
    case '/dogma':
      return <CentralDogma />
    case '/molecules':
      return <MolecularViewer />
    case '/learn':
      return <Learn />
    case '/quiz':
      return <Quiz />
    case '/progress':
      return <Progress />
    case '/tutor':
      return <TutorPage />
    default:
      return <Home />
  }
}

/** Counts active study time (only while the tab is visible). */
function useStudyTimer() {
  const add = useStore((s) => s.addStudyTime)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') add(15)
    }, 15000)
    return () => clearInterval(id)
  }, [add])
}

export default function App() {
  const { path } = useRoute()
  const visit = useStore((s) => s.visit)
  const select = useStore((s) => s.select)
  useStudyTimer()
  // Layout effect: runs before child modules' effects, so a module can pre-select from the URL.
  useLayoutEffect(() => {
    visit(path)
    select(null)
  }, [path, visit, select])
  const fullBleed = path === '/'
  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <main className="relative min-w-0 flex-1 overflow-hidden md:rounded-tl-2xl md:border-t md:border-l md:border-white/10">
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-400">Loading module…</div>}>
              <Module path={path} />
            </Suspense>
          </main>
          {!fullBleed && path !== '/tutor' && <InfoPanel />}
        </div>
      </div>
      {path !== '/tutor' && <TutorPanel />}
    </div>
  )
}
