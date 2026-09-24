import { useEffect, useMemo, useRef, useState } from 'react'
import { search, type SearchResult } from '../../engine/search'
import { navigate } from '../../store/router'
import { Icon } from '../ui/Icon'

const KIND_COLOR: Record<string, string> = {
  Organelle: 'text-cyan-300',
  Protein: 'text-violet-300',
  Gene: 'text-sky-300',
  Molecule: 'text-amber-300',
  Pathway: 'text-emerald-300',
  'Cell process': 'text-pink-300',
  Lesson: 'text-orange-300',
  Structure: 'text-teal-300',
}

export function SearchBar() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => (q.trim() ? search(q, 18) : []), [q])
  const grouped = useMemo(() => {
    const g = new Map<string, SearchResult[]>()
    for (const r of results) g.set(r.kind, [...(g.get(r.kind) ?? []), r])
    return [...g.entries()]
  }, [results])
  const flat = grouped.flatMap(([, rs]) => rs)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (r: SearchResult) => {
    navigate(r.route)
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
        <Icon name="search" className="h-4 w-4 text-cyan-300" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, flat.length - 1))
            if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            if (e.key === 'Enter' && flat[active]) go(flat[active])
            if (e.key === 'Escape') inputRef.current?.blur()
          }}
          placeholder="Search p53, glycolysis, mitosis, CDK1, mTOR…"
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          aria-label="Search"
        />
        <kbd className="hidden rounded border border-white/15 px-1.5 text-[10px] text-slate-400 sm:block">/</kbd>
      </div>
      {open && q.trim() && (
        <div className="glass-strong scroll-thin absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl p-2 shadow-2xl">
          {flat.length === 0 && <div className="p-3 text-sm text-slate-400">No results for “{q}”.</div>}
          {grouped.map(([kind, rs]) => (
            <div key={kind} className="mb-1">
              <div className={`px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-widest uppercase ${KIND_COLOR[kind]}`}>{kind}</div>
              {rs.map((r) => {
                const i = flat.indexOf(r)
                return (
                  <button
                    key={r.key}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left ${i === active ? 'bg-cyan-400/15' : 'hover:bg-white/5'}`}
                  >
                    <div className="text-sm text-white">{r.title}</div>
                    <div className="line-clamp-1 text-xs text-slate-400">{r.subtitle}</div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
