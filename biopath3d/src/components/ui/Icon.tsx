/** Small inline SVG icon set (no icon font dependency). */
const PATHS: Record<string, string> = {
  play: 'M7 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  restart: 'M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
  next: 'M6 5v14l8-7zM16 5h2v14h-2z',
  prev: 'M18 5v14l-8-7zM6 5h2v14H6z',
  search: 'M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.3 10.9 4.4 4.4-1.4 1.4-4.4-4.4z',
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z',
  menu: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  info: 'M11 10h2v7h-2zm0-3h2v2h-2zm1-5a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  spark: 'M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7z',
  eye: 'M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  x: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z',
  arrow: 'M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z',
  send: 'M3 20v-7l12-1-12-1V4l19 8z',
}

export function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  )
}
