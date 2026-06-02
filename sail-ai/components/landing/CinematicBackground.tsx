/**
 * components/landing/CinematicBackground.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Three-layer background system:
 *   1. CSS gradient base — instant, narrative-reactive (no GPU needed)
 *   2. Three.js particle field — 2 800 billboard particles, simplex-noise driven
 *      Uniforms smoothly tween on every narrative advance via GSAP
 *   3. Luma/Runway video overlay — fades in when generation completes
 *
 * All Three.js work is dynamically imported (ssr: false) to keep the page
 * server-renderable. Fallback looks identical on low-end devices.
 */
'use client'

import dynamic                     from 'next/dynamic'
import { useRef, useMemo }         from 'react'
import { useFrame, extend }        from '@react-three/fiber'
import * as THREE                  from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import gsap                        from 'gsap'
import { useNarrative, SCENES }    from './narrativeStore'

// ── Shader source ─────────────────────────────────────────────────────────────

const VERT = /* glsl */`
precision mediump float;

// ── Simplex noise 2D (Stefan Gustavson, public domain) ─────────────────────
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                 + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz  + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ── Uniforms ───────────────────────────────────────────────────────────────
uniform float uTime;
uniform float uSpeed;
uniform float uBright;
uniform vec3  uColor1;  // accent
uniform vec3  uColor2;  // cool shift

attribute float aScale;
attribute float aPhase;

varying float vAlpha;
varying vec3  vColor;
varying float vNoise;

void main() {
  float t    = uTime * uSpeed;
  float n    = snoise(vec2(position.x * 0.35 + t * 0.18, position.y * 0.35 + t * 0.13));
  float n2   = snoise(vec2(position.x * 0.7  - t * 0.22, position.y * 0.7  + t * 0.17));

  vec3 pos   = position;
  pos.x     += sin(t * 0.11 + aPhase) * 0.6 + n  * 0.4;
  pos.y     += cos(t * 0.09 + aPhase) * 0.4 + n2 * 0.3;
  pos.z      = n * 0.6;

  vec4 mv    = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aScale * uBright * (280.0 / -mv.z);
  gl_Position  = projectionMatrix * mv;

  vAlpha  = clamp((n * 0.5 + 0.5) * uBright, 0.0, 0.95);
  vColor  = mix(uColor2, uColor1, n * 0.5 + 0.5);
  vNoise  = n;
}
`

const FRAG = /* glsl */`
precision mediump float;
varying float vAlpha;
varying vec3  vColor;

void main() {
  vec2  uv = gl_PointCoord - vec2(0.5);
  float d  = length(uv);
  if (d > 0.5) discard;
  float core = 1.0 - smoothstep(0.0, 0.18, d);
  float halo = 1.0 - smoothstep(0.18, 0.5, d);
  float a    = (core * 0.9 + halo * 0.4) * vAlpha;
  gl_FragColor = vec4(vColor + core * 0.3, a);
}
`

// ── Particle field component ──────────────────────────────────────────────────

const COUNT = 2800

function OceanParticles() {
  const ref      = useRef<THREE.Points>(null)
  const matRef   = useRef<THREE.ShaderMaterial>(null)
  const { node } = useNarrative()
  const prevNode  = useRef(node)

  // Build geometry once
  const [positions, scales, phases] = useMemo(() => {
    const pos    = new Float32Array(COUNT * 3)
    const sc     = new Float32Array(COUNT)
    const ph     = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 16.0
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10.0
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4.0
      sc[i]           = 0.8 + Math.random() * 2.2
      ph[i]           = Math.random() * Math.PI * 2.0
    }
    return [pos, sc, ph]
  }, [])

  const uniforms = useMemo(() => ({
    uTime:   { value: 0.0 },
    uSpeed:  { value: 0.18 },
    uBright: { value: 0.35 },
    uColor1: { value: new THREE.Color(0x14b8a6) },
    uColor2: { value: new THREE.Color(0x040818) },
  }), [])

  // Tween uniforms when narrative advances
  useRef(() => {
    const scene = SCENES[node]
    if (!matRef.current || node === prevNode.current) return
    prevNode.current = node
    const u = matRef.current.uniforms
    gsap.to(u.uSpeed,  { value: scene.particleSpeed,  duration: 2.8, ease: 'power2.inOut' })
    gsap.to(u.uBright, { value: scene.particleBright, duration: 2.2, ease: 'power2.inOut' })
    const [r, g, b] = scene.accentRgb
    gsap.to(u.uColor1.value, { r: r / 255, g: g / 255, b: b / 255, duration: 3.0, ease: 'power1.inOut' })
  })

  // React to node changes
  const lastTweenedNode = useRef<string>('')
  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = clock.getElapsedTime()

    // Tween on node change (done inside useFrame to avoid stale closure issues)
    if (node !== lastTweenedNode.current) {
      lastTweenedNode.current = node
      const scene = SCENES[node]
      const u     = matRef.current.uniforms
      gsap.to(u.uSpeed,  { value: scene.particleSpeed,  duration: 2.8, ease: 'power2.inOut' })
      gsap.to(u.uBright, { value: scene.particleBright, duration: 2.2, ease: 'power2.inOut' })
      const [r, g, b] = scene.accentRgb
      gsap.to(u.uColor1.value, {
        r: r / 255, g: g / 255, b: b / 255,
        duration: 3.0, ease: 'power1.inOut',
      })
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale"   args={[scales,    1]} />
        <bufferAttribute attach="attributes-aPhase"   args={[phases,    1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ── Dynamically imported Canvas (no SSR) ─────────────────────────────────────

const ParticleCanvas = dynamic(
  () => import('@react-three/fiber').then((mod) => {
    const { Canvas } = mod
    function ParticleScene() {
      return (
        <Canvas
          camera={{ position: [0, 0, 7], fov: 65 }}
          style={{ position: 'absolute', inset: 0 }}
          gl={{ antialias: false, alpha: true }}
          dpr={[1, 1.5]}
        >
          <OceanParticles />
        </Canvas>
      )
    }
    return { default: ParticleScene }
  }),
  { ssr: false },
)

// ── Main export ───────────────────────────────────────────────────────────────

export function CinematicBackground() {
  const { node, videoUrl } = useNarrative()
  const scene = SCENES[node]

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">

      {/* Layer 1 — CSS gradient base (instant, no JS) */}
      <motion.div
        key={node}
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 2.2, ease: 'easeInOut' }}
        style={{ background: scene.bg }}
        className="absolute inset-0"
      />

      {/* Layer 2 — Three.js particles */}
      <div className="absolute inset-0 opacity-90">
        <ParticleCanvas />
      </div>

      {/* Layer 3 — AI-generated video overlay */}
      <AnimatePresence>
        {videoUrl && (
          <motion.video
            key={videoUrl}
            src={videoUrl}
            autoPlay loop muted playsInline
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.5, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity"
          />
        )}
      </AnimatePresence>

      {/* Accent glow — radial halo that follows the narrative accent color */}
      <motion.div
        key={`glow-${node}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.5 }}
        style={{
          background: `radial-gradient(ellipse 55% 45% at 65% 50%, ${scene.accentHex}18 0%, transparent 70%)`,
        }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Bottom vignette — grounds the iPhone frame */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(4,8,24,0.7) 0%, transparent 40%)' }}
      />
    </div>
  )
}
