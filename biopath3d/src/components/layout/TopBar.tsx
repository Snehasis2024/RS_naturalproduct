import { SearchBar } from './SearchBar'
import { useStore } from '../../store/useStore'
import { Icon } from '../ui/Icon'

export function TopBar() {
  const setNavOpen = useStore((s) => s.setNavOpen)
  const tutorOpen = useStore((s) => s.tutorOpen)
  const setTutorOpen = useStore((s) => s.setTutorOpen)
  const rightOpen = useStore((s) => s.rightOpen)
  const setRightOpen = useStore((s) => s.setRightOpen)
  const showLabels = useStore((s) => s.showLabels)
  const setShowLabels = useStore((s) => s.setShowLabels)
  return (
    <header className="relative z-20 flex items-center gap-2 px-3 py-2.5 sm:px-4">
      <button className="btn px-2 lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
        <Icon name="menu" />
      </button>
      <SearchBar />
      <div className="ml-auto flex items-center gap-1.5">
        <button className={`btn hidden sm:inline-flex ${showLabels ? 'btn-active' : ''}`} onClick={() => setShowLabels(!showLabels)} title="Toggle 3D labels">
          Labels
        </button>
        <button className={`btn ${rightOpen ? 'btn-active' : ''}`} onClick={() => setRightOpen(!rightOpen)} title="Toggle info panel">
          <Icon name="info" /> <span className="hidden sm:inline">Info</span>
        </button>
        <button className={`btn ${tutorOpen ? 'btn-active' : ''}`} onClick={() => setTutorOpen(!tutorOpen)}>
          🤖 <span className="hidden sm:inline">BioTutor</span>
        </button>
      </div>
    </header>
  )
}
