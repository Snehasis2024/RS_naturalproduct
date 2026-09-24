import { useSyncExternalStore } from 'react'

/** Minimal hash router: works on static hosting with no server config. */
function read() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs] = raw.split('?')
  return { path: path || '/', params: new URLSearchParams(qs ?? ''), raw }
}

let current = read()
const listeners = new Set<() => void>()
window.addEventListener('hashchange', () => {
  current = read()
  listeners.forEach((l) => l())
})

export function useRoute() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}

export function navigate(to: string) {
  const target = to.startsWith('#') ? to : `#${to}`
  if (window.location.hash === target) return
  window.location.hash = target
}

/** Update query params without adding noise to history. */
export function setParam(key: string, value: string | null) {
  const { path, params } = read()
  if (value === null) params.delete(key)
  else params.set(key, value)
  const qs = params.toString()
  history.replaceState(null, '', `#${path}${qs ? `?${qs}` : ''}`)
  current = read()
  listeners.forEach((l) => l())
}
