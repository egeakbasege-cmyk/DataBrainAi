'use client'

/**
 * AbyssLoader — code-glyph swan particle system
 *
 * Root causes of previous invisibility:
 *   1. GLSL compact noise used `.5`, `1.`, `289.` etc — invalid in GLSL ES
 *      (digits required on both sides of decimal). Shader compiled to nothing.
 *   2. Rain src.y = 10..32 but camera sees y ≈ [-1.7, 3.7]. Particles
 *      were off-screen for the first 1-3 seconds.
 *
 * Fixes applied:
 *   • Expanded simplex noise with correct float literals throughout
 *   • src.y = -1..9 so rain is visible immediately at t=0
 *   • mod range 12.0 (from 40.0) for tighter rain cycling
 *   • Phase-offset rain via aRnd.y so columns are staggered at t=0
 */

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree }           from '@react-three/fiber'
import * as THREE                               from 'three'
import gsap                                     from 'gsap'

// ─── Adaptive particle count ───────────────────────────────────────────────────

const N = (() => {
  if (typeof navigator === 'undefined') return 8_000
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return 4_000
  const c = navigator.hardwareConcurrency ?? 4
  return c <= 4 ? 5_500 : c <= 8 ? 8_500 : 11_000
})()

// ─── Atlas — 5×5 code glyphs ──────────────────────────────────────────────────

const COLS = 5
const ROWS = 5

function makeAtlas(): THREE.CanvasTexture {
  const SIZE = 512
  const cv   = document.createElement('canvas')
  cv.width   = SIZE
  cv.height  = SIZE
  const ctx  = cv.getContext('2d')!

  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.font         = '700 68px "SFMono-Regular",Consolas,"Courier New",monospace'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = '#ffffff'

  const glyphs = [
    '{', '}', ';', '(', ')', '[', ']', '=>', '||', '&&',
    '!', '==', '+=', '>>', 'for', 'if', 'let', 'map', '<', '>',
    '/', '*', '+', '-', '~',
  ]
  const cw = SIZE / COLS
  const ch = SIZE / ROWS
  glyphs.forEach((g, i) => {
    ctx.fillText(g, (i % COLS) * cw + cw / 2, Math.floor(i / COLS) * ch + ch / 2)
  })

  const tex           = new THREE.CanvasTexture(cv)
  tex.anisotropy      = 8
  tex.minFilter       = THREE.LinearMipmapLinearFilter
  tex.magFilter       = THREE.LinearFilter
  tex.generateMipmaps = true
  return tex
}

// ─── GLSL vertex shader ────────────────────────────────────────────────────────
// IMPORTANT: every float literal has digits on both sides of the decimal point.
// `.5` / `1.` / `289.` are rejected by many GLSL ES drivers → silent black.

const VERT = /* glsl */`
  uniform float uProgress;
  uniform float uTime;
  uniform float uWingAmp;
  uniform vec3  uMouse;

  attribute vec3  aSrc;   // rain start world position
  attribute vec3  aTgt;   // swan target world position
  attribute vec3  aRnd;   // x:fallSpeed  y:phaseOffset  z:glyphIdx
  attribute float aWing;  // 1.0 = wing particle

  varying vec2  vUv;
  varying float vEdge;
  varying float vGlyph;

  // ── 3D Simplex Noise (Ian McEwan / Ashima Arts) ────────────────────────────
  // All literals strictly formatted: 0.5 not .5, 1.0 not 1. etc.
  vec3 mod289_3(vec3 x)  { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289_4(vec4 x)  { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute4(vec4 x)  { return mod289_4(((x * 34.0) + 1.0) * x); }
  vec4 tis4(vec4 r)      { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289_3(i);
    vec4 p = permute4(
      permute4(permute4(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3  ns  = n_ * D.wyz - D.xzx;

    vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 xx = x_ * ns.x + ns.yyyy;
    vec4 yy = y_ * ns.x + ns.yyyy;
    vec4 hh = 1.0 - abs(xx) - abs(yy);

    vec4 b0 = vec4(xx.xy, yy.xy);
    vec4 b1 = vec4(xx.zw, yy.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(hh, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, hh.x);
    vec3 p1 = vec3(a0.zw, hh.y);
    vec3 p2 = vec3(a1.xy, hh.z);
    vec3 p3 = vec3(a1.zw, hh.w);

    vec4 norm = tis4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv   = uv;
    vGlyph = aRnd.z;

    // ── Phase 1: falling code rain ─────────────────────────────────────────
    // aRnd.y phase-offsets each column so rain is visible immediately at t=0.
    vec3 rain = aSrc;
    rain.y -= mod(uTime * aRnd.x * 2.2 + aRnd.y * 2.0, 12.0);

    // ── Phase 2: turbulence during morphing (peak at progress = 0.5) ───────
    float turbMag = sin(uProgress * 3.14159265);
    vec3 turb = vec3(
      snoise(aTgt * 0.4 + vec3(uTime * 0.18, 0.0, 0.0)),
      snoise(aTgt * 0.4 + vec3(0.0, uTime * 0.18, 0.0)),
      snoise(aTgt * 0.4 + vec3(0.0, 0.0, uTime * 0.18))
    ) * turbMag * 1.1;

    vec3 center = mix(rain, aTgt, uProgress) + turb;

    // ── Phase 3: wing flap ─────────────────────────────────────────────────
    if (uProgress > 0.1 && aWing > 0.5) {
      float dx   = abs(aTgt.x);
      float wave = sin(dx * 1.5 - uTime * 2.0) * uWingAmp;
      center.y  += wave * dx * uProgress * 0.30;
      center.z  += wave * dx * uProgress * 0.08;
    }

    // ── Phase 4: mouse repulsion ───────────────────────────────────────────
    if (uProgress > 0.5) {
      vec3  delta = center - uMouse;
      float d     = length(delta);
      if (d < 2.5 && d > 0.001) {
        float f  = pow((2.5 - d) / 2.5, 2.0);
        center  += (delta / d) * f * 0.85;
      }
    }

    // ── Billboard: transform centre → view space, add local quad vertex ────
    // Adding position.xy in view space keeps every quad facing the camera.
    vec4 mvC    = modelViewMatrix * vec4(center, 1.0);
    gl_Position = projectionMatrix * (mvC + vec4(position.xy, 0.0, 0.0));

    vEdge = clamp(length(uv - 0.5) * 2.0, 0.0, 1.0);
  }
`

// ─── GLSL fragment shader ──────────────────────────────────────────────────────

const FRAG = /* glsl */`
  uniform sampler2D uAtlas;
  uniform vec2      uGrid;

  varying vec2  vUv;
  varying float vEdge;
  varying float vGlyph;

  void main() {
    float total = uGrid.x * uGrid.y;
    float idx   = floor(mod(vGlyph, total));
    float col   = mod(idx, uGrid.x);
    float row   = floor(idx / uGrid.x);

    // CanvasTexture flipY = true (default):
    //   canvas row 0 (top pixel) = UV v = 1.0
    //   glyph at canvas row R spans UV v: [(rows-1-R)/rows , (rows-R)/rows]
    vec2 atlasUv = vec2(
      (vUv.x + col) / uGrid.x,
      (uGrid.y - 1.0 - row + vUv.y) / uGrid.y
    );

    vec4 tex = texture2D(uAtlas, atlasUv);
    if (tex.a < 0.15) discard;

    vec3 core  = vec3(0.05, 0.05, 0.08);
    vec3 edge  = vec3(0.10, 0.24, 0.54);
    float fe   = pow(vEdge, 1.6);
    vec3 color = mix(core, edge, fe * 0.48);

    gl_FragColor = vec4(color, tex.a * (0.88 + fe * 0.12));
  }
`

// ─── Swan silhouette — canvas painter → pixel sampler ────────────────────────
//
// Strategy (same as the Carhartt t-shirt):
//   1. Paint a real swan shape onto a 2D canvas
//   2. Sample every dark pixel → world-space 3D target position
//   3. Red pixels  = wing particles (animated separately)
//      Black pixels = body / neck / head (stationary once formed)
//
// World-space mapping (camera at z=7, fov=42, looking at y≈0.8):
//   canvas x: 0→CW  →  world x: -4.5 → +4.5
//   canvas y: 0→CH  →  world y: +2.8 → -1.8  (inverted + shifted up)

interface GeoData {
  src: Float32Array
  tgt: Float32Array
  rnd: Float32Array
  wng: Float32Array
}

function drawSwan(ctx: CanvasRenderingContext2D, CW: number, CH: number) {
  // ── Step 1: wings (red) ── drawn first so body covers the inner overlap
  ctx.fillStyle = '#cc0000'

  // Left wing — large flat ellipse angled slightly upward
  ctx.save()
  ctx.translate(CW * 0.22, CH * 0.52)
  ctx.rotate(0.22)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.275, CH * 0.135, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Right wing — mirror
  ctx.save()
  ctx.translate(CW * 0.78, CH * 0.52)
  ctx.rotate(-0.22)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.275, CH * 0.135, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ── Step 2: body (black) ── covers wing overlap in the centre
  ctx.fillStyle = '#000000'

  // Main body — wide horizontal ellipse
  ctx.save()
  ctx.translate(CW * 0.50, CH * 0.58)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.265, CH * 0.20, -0.06, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Tail — small rounded wedge at the left rear
  ctx.save()
  ctx.translate(CW * 0.245, CH * 0.545)
  ctx.rotate(0.45)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.085, CH * 0.065, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ── Step 3: neck (black) ── thick S-curve bezier stroke
  ctx.beginPath()
  ctx.moveTo(CW * 0.505, CH * 0.375)                    // neck base (top of body)
  ctx.bezierCurveTo(
    CW * 0.525, CH * 0.26,                              // control 1
    CW * 0.60,  CH * 0.22,                              // control 2
    CW * 0.625, CH * 0.145,                             // neck top
  )
  ctx.lineWidth   = CW * 0.046
  ctx.strokeStyle = '#000000'
  ctx.lineCap     = 'round'
  ctx.stroke()

  // ── Step 4: head (black) ── rounded ellipse at neck tip
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.ellipse(CW * 0.638, CH * 0.118, CW * 0.054, CH * 0.046, -0.3, 0, Math.PI * 2)
  ctx.fill()

  // ── Step 5: beak ── small triangle extending forward
  ctx.beginPath()
  ctx.moveTo(CW * 0.685, CH * 0.105)
  ctx.lineTo(CW * 0.722, CH * 0.115)
  ctx.lineTo(CW * 0.685, CH * 0.130)
  ctx.closePath()
  ctx.fill()

  // ── Step 6: eye ── tiny white dot so the head reads clearly
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(CW * 0.655, CH * 0.108, CW * 0.010, 0, Math.PI * 2)
  ctx.fill()
}

function buildGeoData(): GeoData {
  // ── Paint the swan ────────────────────────────────────────────────────────
  const CW = 600, CH = 450
  const cv  = document.createElement('canvas')
  cv.width  = CW
  cv.height = CH
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CW, CH)
  drawSwan(ctx, CW, CH)

  // ── Sample coloured pixels → world positions ──────────────────────────────
  const pixels = ctx.getImageData(0, 0, CW, CH).data
  const pool: { wx: number; wy: number; isWing: boolean }[] = []

  for (let py = 0; py < CH; py++) {
    for (let px = 0; px < CW; px++) {
      const i = (py * CW + px) * 4
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
      if (r > 200 && g > 200 && b > 200) continue  // white → skip

      // World-space coordinates
      const wx = (px / CW - 0.5) *  9.0
      const wy = -(py / CH - 0.5) * 5.0 + 0.35     // +0.35 shifts swan up slightly

      // Red pixel = wing, dark pixel = body/neck/head
      const isWing = r > 140 && g < 80 && b < 80
      pool.push({ wx, wy, isWing })
    }
  }

  // Shuffle pool so random subsampling gives uniform coverage
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp
  }

  // ── Fill typed arrays ─────────────────────────────────────────────────────
  const src = new Float32Array(N * 3)
  const tgt = new Float32Array(N * 3)
  const rnd = new Float32Array(N * 3)
  const wng = new Float32Array(N)

  for (let i = 0; i < N; i++) {
    // Rain start: y = -1..9 → immediately visible (camera sees y ≈ [-1.7, 3.7])
    src[i*3]     = (Math.random() - 0.5) * 26
    src[i*3 + 1] = Math.random() * 10.0 - 1.0
    src[i*3 + 2] = (Math.random() - 0.5) * 14

    // Target: cycle through the pool (wraps if pool < N)
    const pt     = pool[i % pool.length]
    tgt[i*3]     = pt.wx + (Math.random() - 0.5) * 0.06
    tgt[i*3 + 1] = pt.wy + (Math.random() - 0.5) * 0.06
    tgt[i*3 + 2] = (Math.random() - 0.5) * 0.28
    wng[i]       = pt.isWing ? 1.0 : 0.0

    rnd[i*3]     = 0.65 + Math.random() * 1.9
    rnd[i*3 + 1] = Math.random() * Math.PI * 2
    rnd[i*3 + 2] = Math.floor(Math.random() * 25)
  }

  return { src, tgt, rnd, wng }
}

// ─── Uniforms type ─────────────────────────────────────────────────────────────

interface Uniforms {
  [key: string]: { value: unknown }
  uProgress:     { value: number }
  uTime:         { value: number }
  uWingAmp:      { value: number }
  uMouse:        { value: THREE.Vector3 }
  uAtlas:        { value: THREE.Texture | null }
  uGrid:         { value: THREE.Vector2 }
}

// ─── SwanScene (runs inside R3F Canvas) ───────────────────────────────────────

function SwanScene({ isActive, isComplete }: { isActive: boolean; isComplete: boolean }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { pointer, viewport } = useThree()

  // Atlas created client-side (no SSR)
  const [atlas, setAtlas] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const t = makeAtlas()
    setAtlas(t)
    return () => t.dispose()
  }, [])

  // Particle data — computed once, stable reference
  const geoData = useMemo<GeoData>(() => buildGeoData(), [])

  // Uniforms — single object, mutated in-place; never re-created
  const u = useRef<Uniforms>({
    uProgress: { value: 0.0 },
    uTime:     { value: 0.0 },
    uWingAmp:  { value: 0.0 },
    uMouse:    { value: new THREE.Vector3() },
    uAtlas:    { value: null },
    uGrid:     { value: new THREE.Vector2(COLS, ROWS) },
  })

  // Wire atlas into uniforms when ready
  useEffect(() => { u.current.uAtlas.value = atlas }, [atlas])

  // Build InstancedMesh imperatively — avoids R3F JSX args[] type issues
  useEffect(() => {
    if (!atlas || !groupRef.current) return

    const geo = new THREE.PlaneGeometry(0.095, 0.095)
    geo.setAttribute('aSrc',  new THREE.InstancedBufferAttribute(geoData.src, 3))
    geo.setAttribute('aTgt',  new THREE.InstancedBufferAttribute(geoData.tgt, 3))
    geo.setAttribute('aRnd',  new THREE.InstancedBufferAttribute(geoData.rnd, 3))
    geo.setAttribute('aWing', new THREE.InstancedBufferAttribute(geoData.wng, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms:       u.current,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.NormalBlending,
      side:           THREE.DoubleSide,
    })

    const mesh         = new THREE.InstancedMesh(geo, mat, N)
    mesh.frustumCulled = false
    const identity     = new THREE.Matrix4()
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, identity)
    mesh.instanceMatrix.needsUpdate = true

    const group = groupRef.current
    group.add(mesh)

    return () => {
      group.remove(mesh)
      geo.dispose()
      mat.dispose()
    }
  }, [atlas, geoData])

  // GSAP drives progress + wing amplitude (cleanup kills tweens on re-run)
  useEffect(() => {
    const prog = isComplete ? 1.0 : isActive ? 0.86 : 0.0
    const amp  = isComplete ? 0.38 : isActive ? 0.26 : 0.0
    const t1 = gsap.to(u.current.uProgress, { value: prog, duration: 3.5, ease: 'power3.inOut' })
    const t2 = gsap.to(u.current.uWingAmp,  { value: amp,  duration: 3.0, ease: 'elastic.out(1,0.6)' })
    return () => { t1.kill(); t2.kill() }
  }, [isActive, isComplete])

  // Zero-allocation per-frame uniform update
  const mouseTarget = useRef(new THREE.Vector3())
  useFrame(({ clock }) => {
    u.current.uTime.value = clock.getElapsedTime()
    mouseTarget.current.set(
      (pointer.x * viewport.width)  / 2.0,
      (pointer.y * viewport.height) / 2.0,
      0.0,
    )
    u.current.uMouse.value.lerp(mouseTarget.current, 0.08)
  })

  return <group ref={groupRef} />
}

// ─── Camera rig ────────────────────────────────────────────────────────────────

function CameraRig() {
  const { camera, size, pointer } = useThree()

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = size.width < 500 ? 48.0 : 42.0
    cam.position.set(0.0, 1.0, 7.0)
    cam.lookAt(0.0, 0.8, 0.0)
    cam.updateProjectionMatrix()
  }, [camera, size.width])

  useFrame(() => {
    camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04
    camera.position.y += (1.0 + pointer.y * 0.25 - camera.position.y) * 0.04
    camera.lookAt(0.0, 0.8, 0.0)
  })

  return null
}

// ─── Public export ────────────────────────────────────────────────────────────

interface AbyssProps {
  modeLabel:  string
  isActive:   boolean
  isComplete: boolean
}

export function AbyssLoader({ modeLabel, isActive, isComplete }: AbyssProps) {
  const dot    = isComplete ? '#059669' : isActive ? '#0055ff' : 'rgba(0,0,0,0.22)'
  const glow   = (isActive || isComplete) ? `0 0 8px ${dot}` : 'none'
  const status = isActive   ? `${modeLabel} · compiling…`
               : isComplete ? `${modeLabel} · unit_formed`
               :              `${modeLabel} · standby`

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      height:        300,
      borderRadius:  14,
      overflow:     'hidden',
      background:   '#fafaf8',
      border:       '1px solid rgba(0,0,0,0.07)',
      boxShadow:    '0 2px 16px rgba(0,0,0,0.06)',
    }}>
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#fafaf8']} />
        <CameraRig />
        <SwanScene isActive={isActive} isComplete={isComplete} />
      </Canvas>

      {/* Status bar */}
      <div style={{
        position:      'absolute',
        top:            10,
        left:           12,
        right:          12,
        zIndex:         10,
        display:       'flex',
        alignItems:    'center',
        gap:            8,
        pointerEvents: 'none',
      }}>
        <span style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          flexShrink:   0,
          background:   dot,
          boxShadow:    glow,
          transition:  'background 0.4s, box-shadow 0.4s',
        }} />
        <span style={{
          background:           'rgba(255,255,255,0.72)',
          backdropFilter:       'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border:               '1px solid rgba(0,0,0,0.07)',
          borderRadius:          7,
          padding:              '3px 11px',
          color:                'rgba(0,0,0,0.55)',
          fontSize:              11,
          fontFamily:           '"SFMono-Regular","JetBrains Mono","Courier New",monospace',
          letterSpacing:        '0.12em',
          fontWeight:            600,
        }}>
          {status}
        </span>
      </div>

      <div style={{
        position:      'absolute',
        inset:          0,
        pointerEvents: 'none',
        borderRadius:   14,
        boxShadow:     'inset 0 0 56px rgba(250,250,248,0.5)',
        zIndex:         1,
      }} />
    </div>
  )
}
