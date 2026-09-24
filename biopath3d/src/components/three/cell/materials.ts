import * as THREE from 'three'
import type { PartState } from './context'

/** Adjusts emissive glow / opacity on a set of materials to reflect interaction state. */
export function applyState(
  mats: THREE.Material[],
  state: PartState,
  base: { opacity: number; emissive: number },
  transparentMode: boolean,
) {
  const glow = state === 'selected' ? 0.9 : state === 'hover' ? 0.55 : base.emissive
  const opacityScale = state === 'dim' ? 0.28 : 1
  const tMode = transparentMode && state !== 'selected' && state !== 'hover' ? 0.45 : 1
  for (const m of mats) {
    const mm = m as THREE.MeshStandardMaterial
    if ('emissiveIntensity' in mm) mm.emissiveIntensity = glow
    const target = base.opacity * opacityScale * tMode
    mm.transparent = target < 0.999
    mm.opacity = target
    mm.depthWrite = target > 0.6
  }
}

export function std(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.12,
    roughness: 0.45,
    metalness: 0.05,
    ...opts,
  })
}

/** Fresnel rim shader for membranes: glows at grazing angles, clear face-on. */
export function fresnelMaterial(color: string, power = 2.2, intensity = 1.2) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uPower; uniform float uIntensity; uniform float uOpacity;
      varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
        gl_FragColor = vec4(uColor * (0.25 + f * uIntensity), (0.04 + f * 0.75) * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

/** Deterministic PRNG for reproducible procedural geometry. */
export function prng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function randomInShell(r: () => number, rMin: number, rMax: number, avoid?: { c: THREE.Vector3; r: number }) {
  for (let i = 0; i < 200; i++) {
    const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1)
    const len = v.length()
    if (len < 0.2 || len > 1) continue
    v.normalize().multiplyScalar(rMin + (rMax - rMin) * r())
    v.y *= 0.8
    if (avoid && v.distanceTo(avoid.c) < avoid.r) continue
    return v
  }
  return new THREE.Vector3(rMax, 0, 0)
}
