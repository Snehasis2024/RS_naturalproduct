import { useEffect, useRef, useState } from 'react'

/** Mutable animation clock shared between the R3F frame loop (writes) and React UI (polls). */
export interface SimClock {
  t: number
  playing: boolean
  speed: number
  start: number
  end: number
  loop: boolean
}

export function useSimClock(init: Partial<SimClock> & { end: number }) {
  const ref = useRef<SimClock>({ t: 0, playing: true, speed: 1, start: 0, loop: false, ...init })
  return ref
}

/** Advances the clock; call from useFrame. */
export function tick(c: SimClock, dt: number) {
  if (!c.playing) return
  c.t += Math.min(dt, 0.1) * c.speed
  if (c.t >= c.end) {
    if (c.loop) c.t = c.start + ((c.t - c.start) % (c.end - c.start))
    else {
      c.t = c.end
      c.playing = false
    }
  }
}

/** Re-renders the UI ~12×/s with the clock's current time. */
export function useClockPoll(ref: React.RefObject<SimClock>, hz = 12) {
  const [snap, setSnap] = useState({ t: 0, playing: true, speed: 1 })
  useEffect(() => {
    const id = setInterval(() => {
      const c = ref.current
      if (c) setSnap((s) => (s.t === c.t && s.playing === c.playing && s.speed === c.speed ? s : { t: c.t, playing: c.playing, speed: c.speed }))
    }, 1000 / hz)
    return () => clearInterval(id)
  }, [ref, hz])
  return snap
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
