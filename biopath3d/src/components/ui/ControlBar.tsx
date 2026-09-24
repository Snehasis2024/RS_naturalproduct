import type { ReactNode } from 'react'

/** Bottom-centred glass control strip used by every simulation. */
export function ControlBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`pointer-events-auto glass absolute inset-x-2 bottom-2 z-10 rounded-2xl p-2.5 sm:inset-x-4 sm:bottom-4 ${className}`}>
      {children}
    </div>
  )
}

export function Toolbar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pointer-events-auto glass absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-2xl p-2 ${className}`}>{children}</div>
}

export function SpeedControl({ speed, setSpeed }: { speed: number; setSpeed: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-300">
      Speed
      <input type="range" min={0.1} max={3} step={0.05} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-24" aria-label="Animation speed" />
      <span className="w-9 font-mono text-cyan-200">{speed.toFixed(2)}×</span>
    </label>
  )
}
