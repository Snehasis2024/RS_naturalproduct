import { NAV } from './nav'
import { navigate, useRoute } from '../../store/router'
import { useStore } from '../../store/useStore'

export function Sidebar() {
  const { path } = useRoute()
  const navOpen = useStore((s) => s.navOpen)
  const setNavOpen = useStore((s) => s.setNavOpen)
  const setTutorOpen = useStore((s) => s.setTutorOpen)
  return (
    <>
      {navOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} />}
      <nav
        className={`glass-strong fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/10 transition-transform lg:static lg:z-auto lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main"
      >
        <button className="flex items-center gap-2.5 px-4 pt-4 pb-3 text-left" onClick={() => navigate('/')}>
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-lg shadow-violet-900/50">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/90" />
            <span className="absolute right-2 bottom-2 h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-tight text-white">BioPath 3D</span>
            <span className="block text-[10px] tracking-wider text-cyan-300/80 uppercase">Virtual biology lab</span>
          </span>
        </button>
        <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-4">
          {NAV.map((n) => {
            const active = path === n.path
            return (
              <button
                key={n.path}
                onClick={() => {
                  if (n.path === '/tutor') setTutorOpen(true)
                  navigate(n.path)
                  setNavOpen(false)
                }}
                className={`group mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition ${n.sub ? 'pl-7 text-[12px]' : ''} ${active ? 'bg-cyan-400/15 text-cyan-100 shadow-[inset_2px_0_0_#22d3ee]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <span className={`text-base ${n.sub ? 'text-sm opacity-80' : ''}`}>{n.icon}</span>
                {n.label}
              </button>
            )
          })}
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-slate-500">
          For university teaching. Structures from RCSB PDB; small-molecule 3D models are computed conformers.
        </div>
      </nav>
    </>
  )
}
