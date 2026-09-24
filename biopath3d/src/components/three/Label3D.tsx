import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export interface DomLabelProps {
  position?: [number, number, number] | THREE.Vector3
  /** Plain text content (escaped). */
  text?: string
  /** Trusted HTML built from app content (use escapeHtml for any dynamic text). */
  html?: string
  className?: string
  /** 'above' places the label above its anchor; 'center' centres it on the anchor. */
  anchor?: 'above' | 'center' | 'left'
  /** Per-frame override: return a position, true (keep position), or null/false to hide. */
  get?: () => THREE.Vector3 | boolean | null
  style?: Partial<CSSStyleDeclaration>
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * World-anchored DOM label. Unlike drei's <Html>, it does not create a nested
 * React root: a single div is positioned imperatively every frame, and it hides
 * itself when any ancestor is invisible or the anchor is behind the camera.
 */
export function DomLabel({ position = [0, 0, 0], text, html, className = 'label-3d', anchor = 'above', get, style }: DomLabelProps) {
  const { gl, camera, size } = useThree()
  const group = useRef<THREE.Group>(null)
  const el = useMemo(() => document.createElement('div'), [])
  const v = useMemo(() => new THREE.Vector3(), [])

  useLayoutEffect(() => {
    Object.assign(el.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none', zIndex: '5', willChange: 'transform', display: 'none' })
    gl.domElement.parentElement?.appendChild(el)
    return () => {
      el.parentNode?.removeChild(el)
    }
  }, [gl, el])

  useLayoutEffect(() => {
    el.className = className
    if (html !== undefined) el.innerHTML = html
    else el.textContent = text ?? ''
    if (style) Object.assign(el.style, style)
  }, [el, className, text, html, style])

  useFrame(() => {
    const g = group.current
    if (!g) return
    let vis = true
    for (let o: THREE.Object3D | null = g; o; o = o.parent) if (!o.visible) vis = false
    if (get) {
      const r = get()
      if (!r) vis = false
      else if (r !== true) g.position.copy(r)
    }
    if (vis) {
      g.getWorldPosition(v).project(camera)
      if (v.z > 1 || v.z < -1) vis = false
    }
    if (!vis) {
      if (el.style.display !== 'none') el.style.display = 'none'
      return
    }
    el.style.display = ''
    const x = (v.x * 0.5 + 0.5) * size.width
    const y = (-v.y * 0.5 + 0.5) * size.height
    const off = anchor === 'center' ? 'translate(-50%,-50%)' : anchor === 'left' ? 'translate(0,-50%)' : 'translate(-50%,-140%)'
    el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) ${off}`
  })

  const p = position instanceof THREE.Vector3 ? ([position.x, position.y, position.z] as [number, number, number]) : position
  return <group ref={group} position={p} />
}

export function Label3D({
  position,
  text,
  hot,
  dim,
  sub,
}: {
  position: [number, number, number]
  text: string
  hot?: boolean
  dim?: boolean
  sub?: string
}) {
  const html = escapeHtml(text) + (sub ? `<span class="ml-1 text-[9px] text-cyan-300/80">${escapeHtml(sub)}</span>` : '')
  return <DomLabel position={position} html={html} className={`label-3d ${hot ? 'hot' : ''} ${dim ? 'dim' : ''}`} />
}

/** A label whose position/visibility is driven every frame (no React re-render). */
export function DynamicLabel({ text, get }: { text: string; get: () => THREE.Vector3 | boolean | null }) {
  return <DomLabel text={text} get={get} />
}
