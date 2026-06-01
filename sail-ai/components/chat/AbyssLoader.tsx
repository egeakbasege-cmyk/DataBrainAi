'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * A B Y S S   L O A D E R   —   Design Direction v2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "The intelligence does not arrive. It assembles itself from the dark."
 *
 * The canvas is a void — #07080C, a near-black that breathes. Out of nothing,
 * a digital rain descends: each glyph a cold cyan streak, the exhaust trail
 * of computation. This is not decoration. This is the system thinking.
 *
 * At the inflection point — when thinking becomes form — the rain fractures.
 * Each particle breaks from its column, spirals through turbulence, and lands.
 * The landing is inevitable: a swan. Not a symbol. A structure. The same
 * algorithmic precision that drives the inference engine is what draws the
 * wings and neck from chaos.
 *
 * Particle language:
 * · Rain      → electric cyan  (#00FFCC)  — raw signal, unresolved
 * · Body      → dark silver    (#A0A0A0)  — the formed intelligence
 * · Wings     → rich gold      (#DDA520)  — the brand's own frequency
 * · Neck/Head → near-white     (#F0F4FF)  — clarity at the apex
 * · Beak      → rich gold      (#DDA520)
 * · Eye       → near-white     (#F0F4FF)
 *
 * Blending: additive. Light accumulates. Dense areas glow. The swan is not
 * painted — it is luminous. It earns its brightness from mass.
 *
 * Post-processing: a single Bloom pass. Threshold low enough that even a
 * lone glyph carries a halo. The effect should feel like phosphor, not neon.
 *
 * Status bar: monospace terminal text on a near-transparent dark pill —
 * the interface layer between the machine and the human watching it.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Updating Swan form to match image_0.png - complex multi-layered wings, organic body shape,
 * graceful neck S-curve with tüy detayları, kafa shape, gaga shape.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useMemo, useEffect, useState }       from 'react'
import { Canvas, useFrame, useThree }                from '@react-three/fiber'
import { EffectComposer, Bloom }                      from '@react-three/postprocessing'
import * as THREE                                     from 'three'
import gsap                                           from 'gsap'

// ─── Adaptive particle count ───────────────────────────────────────────────────

const N = (() => {
  if (typeof navigator === 'undefined') return 8_000
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return 4_000
  const c = navigator.hardwareConcurrency ?? 4
  return c <= 4 ? 5_500 : c <= 8 ? 8_500 : 11_000
})()

// ─── Atlas — 5×5 code glyphs (white on transparent) ──────────────────────────

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

  const tex            = new THREE.CanvasTexture(cv)
  tex.anisotropy      = 8
  tex.minFilter       = THREE.LinearMipmapLinearFilter
  tex.magFilter       = THREE.LinearFilter
  tex.generateMipmaps = true
  return tex
}

// ─── GLSL vertex shader ────────────────────────────────────────────────────────
// Every float literal has digits on both sides of the decimal (GLSL ES spec).

const VERT = /* glsl */`
  uniform float uProgress;
  uniform float uTime;
  uniform float uWingAmp;
  uniform vec3  uMouse;

  attribute vec3  aSrc;    // rain start world position
  attribute vec3  aTgt;    // swan target world position
  attribute vec3  aRnd;    // x:fallSpeed  y:phaseOffset  z:glyphIdx
  attribute float aWing;   // 1.0 = wing particle
  attribute float aEye;    // 1.0 = eye particle

  varying vec2  vUv;
  varying float vEdge;
  varying float vGlyph;
  varying float vWing;
  varying float vEye;
  varying float vProgress;
  varying vec3  vTgt;

  // ── 3D Simplex Noise (Ian McEwan / Ashima Arts) ─────────────────────────────
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
    vUv       = uv;
    vGlyph    = aRnd.z;
    vWing     = aWing;
    vEye      = aEye;
    vProgress = uProgress;
    vTgt      = aTgt;

    // ── Phase 1: falling code rain ──────────────────────────────────────────
    vec3 rain = aSrc;
    rain.y -= mod(uTime * aRnd.x * 2.2 + aRnd.y * 2.0, 12.0);

    // ── Phase 2: turbulence during morphing (peak at progress = 0.5) ────────
    float turbMag = sin(uProgress * 3.14159265);
    vec3 turb = vec3(
      snoise(aTgt * 0.4 + vec3(uTime * 0.18, 0.0, 0.0)),
      snoise(aTgt * 0.4 + vec3(0.0, uTime * 0.18, 0.0)),
      snoise(aTgt * 0.4 + vec3(0.0, 0.0, uTime * 0.18))
    ) * turbMag * 1.1;

    vec3 center = mix(rain, aTgt, uProgress) + turb;

    // ── Phase 3: wing flap ──────────────────────────────────────────────────
    if (uProgress > 0.1 && aWing > 0.5) {
      float dx   = abs(aTgt.x);
      float wave = sin(dx * 1.5 - uTime * 2.0) * uWingAmp;
      center.y  += wave * dx * uProgress * 0.30;
      center.z  += wave * dx * uProgress * 0.08;
    }

    // ── Phase 4: mouse repulsion ────────────────────────────────────────────
    if (uProgress > 0.5) {
      vec3  delta = center - uMouse;
      float d      = length(delta);
      if (d < 2.5 && d > 0.001) {
        float f  = pow((2.5 - d) / 2.5, 2.0);
        center  += (delta / d) * f * 0.85;
      }
    }

    // ── Billboard: view-space offset so quads always face camera ────────────
    vec4 mvC    = modelViewMatrix * vec4(center, 1.0);
    gl_Position = projectionMatrix * (mvC + vec4(position.xy, 0.0, 0.0));

    vEdge = clamp(length(uv - 0.5) * 2.0, 0.0, 1.0);
  }
`

// ─── GLSL fragment shader ──────────────────────────────────────────────────────
// Color palette (additive blending on dark background):
//    rain      → cyan  #00FFCC  (0.0, 1.0, 0.8)
//    body      → dark silver    (#A0A0A0)  — the formed intelligence
//    wing      → rich gold      (#DDA520)  — the brand's own frequency
//    head/neck → near-white     (#F0F4FF)  — clarity at the apex
//    beak      → rich gold      (#DDA520)
//    eye       → near-white     (#F0F4FF)

const FRAG = /* glsl */`
  uniform sampler2D uAtlas;
  uniform vec2      uGrid;

  varying vec2  vUv;
  varying float vEdge;
  varying float vGlyph;
  varying float vWing;
  varying float vEye;
  varying float vProgress;
  varying vec3  vTgt;

  void main() {
    float total = uGrid.x * uGrid.y;
    float idx   = floor(mod(vGlyph, total));
    float col   = mod(idx, uGrid.x);
    float row   = floor(idx / uGrid.x);

    // CanvasTexture flipY = true: canvas row 0 (top) = UV v = 1.0
    vec2 atlasUv = vec2(
      (vUv.x + col) / uGrid.x,
      (uGrid.y - 1.0 - row + vUv.y) / uGrid.y
    );

    vec4 tex = texture2D(uAtlas, atlasUv);
    if (tex.a < 0.15) discard;

    // Palette colours
    vec3 cCyan        = vec3(0.0,  1.0,  0.8);
    vec3 cDarkSilver  = vec3(0.6,  0.65, 0.72);
    vec3 cRichGold    = vec3(0.85, 0.7,  0.45);
    vec3 cBrightWhite = vec3(0.95, 0.98, 1.0);
    vec3 cEyeWhite    = vec3(1.0,  1.0,  1.0);

    // Swan base color
    // aWing == 1.0 covers both wing AND beak (both painted red on canvas → gold)
    vec3 swanColor;
    if (vEye == 1.0) {
      swanColor = cEyeWhite;
    } else if (vWing == 1.0) {
      swanColor = cRichGold;
    } else {
      swanColor = cDarkSilver;
    }

    // Neck → head gradient: silver at base, near-white at apex
    // New world-space Y: neck base ≈ 0.0, head ≈ 2.8
    float headNeckT = smoothstep(0.8, 2.4, vTgt.y);
    headNeckT *= (1.0 - vEye);
    swanColor = mix(swanColor, cBrightWhite, headNeckT);

    vec3 color = mix(cCyan, swanColor, smoothstep(0.0, 0.65, vProgress));

    float fe = pow(vEdge, 1.8);
    color = color * (1.0 - fe * 0.32);

    float alpha = tex.a * (1.0 - fe * 0.55);

    gl_FragColor = vec4(color, alpha);
  }
`

// ─── Swan silhouette — canvas painter → pixel sampler ────────────────────────

interface GeoData {
  src: Float32Array
  tgt: Float32Array
  rnd: Float32Array
  wng: Float32Array
  eye: Float32Array
}

function drawSwan(ctx: CanvasRenderingContext2D, CW: number, CH: number) {
  // ── Profile-view swan, facing right ────────────────────────────────────────
  // Layout (relative to 600×450 canvas):
  //   Wing   → upper-left, large arching bezier shape   (red  → gold)
  //   Body   → lower-center-right, large oval           (black → silver)
  //   Tail   → bottom-left, pointed                    (black → silver)
  //   Neck   → S-curve from body top-right to head      (black → silver→white)
  //   Head   → upper-right oval                         (black → white)
  //   Beak   → triangle pointing right                  (red  → gold)
  //   Eye    → tiny white circle                        (white → white)

  // === WING (red → gold particles in shader) ===
  ctx.fillStyle = '#cc0000'
  ctx.beginPath()
  // Wing root at top-left of body
  ctx.moveTo(CW * 0.40, CH * 0.60)
  // Leading edge sweeps up and left to wing tip
  ctx.bezierCurveTo(
    CW * 0.22, CH * 0.50,
    CW * 0.06, CH * 0.22,
    CW * 0.18, CH * 0.05,
  )
  // Tip curves across to trailing edge
  ctx.bezierCurveTo(
    CW * 0.28, CH * 0.00,
    CW * 0.50, CH * 0.14,
    CW * 0.54, CH * 0.36,
  )
  // Trailing edge closes back to root
  ctx.bezierCurveTo(
    CW * 0.53, CH * 0.48,
    CW * 0.47, CH * 0.56,
    CW * 0.40, CH * 0.60,
  )
  ctx.closePath()
  ctx.fill()

  // === BODY (black → silver) ===
  ctx.fillStyle = '#000000'
  ctx.save()
  ctx.translate(CW * 0.56, CH * 0.74)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.25, CH * 0.15, -0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // === TAIL (black, pointed left-downward) ===
  ctx.beginPath()
  ctx.moveTo(CW * 0.35, CH * 0.82)
  ctx.lineTo(CW * 0.14, CH * 0.90)
  ctx.lineTo(CW * 0.22, CH * 0.74)
  ctx.closePath()
  ctx.fill()

  // === NECK — thick S-curve bezier stroke ===
  ctx.beginPath()
  ctx.moveTo(CW * 0.64, CH * 0.60)        // neck base (top-right of body)
  ctx.bezierCurveTo(
    CW * 0.70, CH * 0.44,                 // pulls right and up
    CW * 0.74, CH * 0.28,
    CW * 0.77, CH * 0.18,                 // neck top
  )
  ctx.lineWidth   = CW * 0.052
  ctx.strokeStyle = '#000000'
  ctx.lineCap     = 'round'
  ctx.stroke()

  // === HEAD (black oval, slightly tilted) ===
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.ellipse(CW * 0.785, CH * 0.130, CW * 0.054, CH * 0.042, 0.22, 0, Math.PI * 2)
  ctx.fill()

  // === BEAK (red → gold, pointing right) ===
  ctx.fillStyle = '#cc0000'
  ctx.beginPath()
  ctx.moveTo(CW * 0.830, CH * 0.114)
  ctx.lineTo(CW * 0.882, CH * 0.128)
  ctx.lineTo(CW * 0.830, CH * 0.143)
  ctx.closePath()
  ctx.fill()

  // === EYE (pure white for isEye detection) ===
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(CW * 0.806, CH * 0.116, CW * 0.010, 0, Math.PI * 2)
  ctx.fill()
}

function buildGeoData(): GeoData {
  const CW = 600, CH = 450
  const cv  = document.createElement('canvas')
  cv.width  = CW
  cv.height = CH
  const ctx = cv.getContext('2d')!
  // Light grey background so pure white eye pixels are unambiguous
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, CW, CH)
  drawSwan(ctx, CW, CH)

  const pixels = ctx.getImageData(0, 0, CW, CH).data
  const pool: { wx: number; wy: number; isWing: boolean; isEye: boolean }[] = []

  for (let py = 0; py < CH; py++) {
    for (let px = 0; px < CW; px++) {
      const i = (py * CW + px) * 4
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
      // Skip background (#f0f0f0) and its anti-aliased neighbours,
      // but keep pure white eye pixels (r>250,g>250,b>250)
      const nearGrey = r > 224 && g > 224 && b > 224
      const isWhite  = r > 250 && g > 250 && b > 250
      if (nearGrey && !isWhite) continue

      // World-space: wider scale so swan fills the camera view
      const wx = (px / CW - 0.5) * 10.0
      const wy = -(py / CH - 0.5) * 6.0 + 0.6

      // Red pixels  → wing + beak (both become gold)
      // White pixels → eye
      const isWing = r > 140 && g < 80  && b < 80
      const isEye  = r > 250 && g > 250 && b > 250
      pool.push({ wx, wy, isWing, isEye })
    }
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp
  }

  const src = new Float32Array(N * 3)
  const tgt = new Float32Array(N * 3)
  const rnd = new Float32Array(N * 3)
  const wng = new Float32Array(N)
  const eye = new Float32Array(N)

  for (let i = 0; i < N; i++) {
    src[i*3]     = (Math.random() - 0.5) * 26
    src[i*3 + 1] = Math.random() * 10.0 - 1.0
    src[i*3 + 2] = (Math.random() - 0.5) * 14

    const pt     = pool[i % pool.length]
    tgt[i*3]     = pt.wx + (Math.random() - 0.5) * 0.06
    tgt[i*3 + 1] = pt.wy + (Math.random() - 0.5) * 0.06
    tgt[i*3 + 2] = (Math.random() - 0.5) * 0.28
    wng[i]       = pt.isWing ? 1.0 : 0.0
    eye[i]       = pt.isEye  ? 1.0 : 0.0

    rnd[i*3]     = 0.65 + Math.random() * 1.9
    rnd[i*3 + 1] = Math.random() * Math.PI * 2
    rnd[i*3 + 2] = Math.floor(Math.random() * 25)
  }

  return { src, tgt, rnd, wng, eye }
}

// ─── Uniforms type ─────────────────────────────────────────────────────────────

interface Uniforms {
  [key: string]: { value: unknown }
  uProgress:      { value: number }
  uTime:          { value: number }
  uWingAmp:       { value: number }
  uMouse:         { value: THREE.Vector3 }
  uAtlas:         { value: THREE.Texture | null }
  uGrid:          { value: THREE.Vector2 }
}

// ─── SwanScene ────────────────────────────────────────────────────────────────

function SwanScene({ isActive, isComplete }: { isActive: boolean; isComplete: boolean }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { pointer, viewport } = useThree()

  const [atlas, setAtlas] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const t = makeAtlas()
    setAtlas(t)
    return () => t.dispose()
  }, [])

  const geoData = useMemo<GeoData>(() => buildGeoData(), [])

  const u = useRef<Uniforms>({
    uProgress: { value: 0.0 },
    uTime:     { value: 0.0 },
    uWingAmp:  { value: 0.0 },
    uMouse:    { value: new THREE.Vector3() },
    uAtlas:    { value: null },
    uGrid:     { value: new THREE.Vector2(COLS, ROWS) },
  })

  useEffect(() => { u.current.uAtlas.value = atlas }, [atlas])

  useEffect(() => {
    if (!atlas || !groupRef.current) return

    const geo = new THREE.PlaneGeometry(0.095, 0.095)
    geo.setAttribute('aSrc',  new THREE.InstancedBufferAttribute(geoData.src, 3))
    geo.setAttribute('aTgt',  new THREE.InstancedBufferAttribute(geoData.tgt, 3))
    geo.setAttribute('aRnd',  new THREE.InstancedBufferAttribute(geoData.rnd, 3))
    geo.setAttribute('aWing', new THREE.InstancedBufferAttribute(geoData.wng, 1))
    geo.setAttribute('aEye',  new THREE.InstancedBufferAttribute(geoData.eye, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:  VERT,
      fragmentShader: FRAG,
      uniforms:       u.current,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
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

  useEffect(() => {
    const prog = isComplete ? 1.0 : isActive ? 0.86 : 0.0
    const amp  = isComplete ? 0.38 : isActive ? 0.26 : 0.0
    const t1 = gsap.to(u.current.uProgress, { value: prog, duration: 3.5, ease: 'power3.inOut' })
    const t2 = gsap.to(u.current.uWingAmp,  { value: amp,  duration: 3.0, ease: 'elastic.out(1,0.6)' })
    return () => { t1.kill(); t2.kill() }
  }, [isActive, isComplete])

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
  const dot    = isComplete ? '#C9A96E' : isActive ? '#00FFCC' : 'rgba(255,255,255,0.18)'
  const glow   = isComplete ? '0 0 10px #C9A96E88' : isActive ? '0 0 10px #00FFCC66' : 'none'
  const status = isActive   ? `${modeLabel} · compiling…`
               : isComplete ? `${modeLabel} · unit_formed`
               :              `${modeLabel} · standby`

  return (
    <div style={{
      position:      'relative',
      width:        '100%',
      height:        300,
      borderRadius: 14,
      overflow:      'hidden',
      background:    '#07080C',
      border:        '1px solid rgba(255,255,255,0.06)',
      boxShadow:    '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#07080C']} />
        <CameraRig />
        <SwanScene isActive={isActive} isComplete={isComplete} />
        <EffectComposer>
          <Bloom
            intensity={1.4}
            luminanceThreshold={0.06}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* Status bar — terminal aesthetic on dark void */}
      <div style={{
        position:      'absolute',
        top:            10,
        left:           12,
        right:          12,
        zIndex:         10,
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        pointerEvents: 'none',
      }}>
        <span style={{
          width:        6,
          height:        6,
          borderRadius: '50%',
          flexShrink:   0,
          background:    dot,
          boxShadow:    glow,
          transition:  'background 0.4s, box-shadow 0.4s',
        }} />
        <span style={{
          background:            'rgba(7,8,12,0.72)',
          backdropFilter:       'blur(16px) saturate(120%)',
          WebkitBackdropFilter: 'blur(16px) saturate(120%)',
          border:                '1px solid rgba(255,255,255,0.08)',
          borderRadius:          7,
          padding:              '3px 11px',
          color:                'rgba(255,255,255,0.42)',
          fontSize:              11,
          fontFamily:           '"SFMono-Regular","JetBrains Mono","Courier New",monospace',
          letterSpacing:        '0.12em',
          fontWeight:            600,
        }}>
          {status}
        </span>
      </div>

      {/* Subtle vignette — deepens corners without muddying the glow */}
      <div style={{
        position:      'absolute',
        inset:          0,
        pointerEvents: 'none',
        borderRadius:  14,
        background:    'radial-gradient(ellipse at 50% 60%, transparent 40%, rgba(7,8,12,0.55) 100%)',
        zIndex:         1,
      }} />
    </div>
  )
}
