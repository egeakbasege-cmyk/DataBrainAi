'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  A B Y S S   L O A D E R   —   Swan Particle System
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  "The intelligence does not arrive. It assembles itself from the dark."
 *
 *  Cyan code-glyph rain collapses into a side-profile swan silhouette.
 *
 *  Swan layout (canvas 600 × 500, facing RIGHT):
 *  ┌───────────────────────────────────────────────────┐
 *  │                              ●── HEAD/BEAK        │  y≈0.10
 *  │                           ╱                        │
 *  │    WING                  NECK (S-curve)            │
 *  │   (upper-left)          ╱                          │  y≈0.42
 *  │                        ╱                           │
 *  │              ┌────────────────┐                    │
 *  │              │     BODY       │                    │  y≈0.77
 *  └──────────────└────────────────┘────────────────────┘
 *       x≈0.12      x≈0.28    x≈0.72
 *
 *  Colours: wing/beak → gold  body/neck/head → silver  eye → white
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useMemo, useEffect, useState }  from 'react'
import { Canvas, useFrame, useThree }            from '@react-three/fiber'
import { EffectComposer, Bloom }                 from '@react-three/postprocessing'
import * as THREE                                from 'three'
import gsap                                      from 'gsap'

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

const VERT = /* glsl */`
  uniform float uProgress;
  uniform float uTime;
  uniform float uWingAmp;
  uniform vec3  uMouse;

  attribute vec3  aSrc;
  attribute vec3  aTgt;
  attribute vec3  aRnd;
  attribute float aWing;
  attribute float aEye;

  varying vec2  vUv;
  varying float vEdge;
  varying float vGlyph;
  varying float vWing;
  varying float vEye;
  varying float vProgress;

  // Simplex noise — Ian McEwan / Ashima (GLSL-ES compliant literals)
  vec3 mod289_3(vec3 x)  { return x - floor(x*(1.0/289.0))*289.0; }
  vec4 mod289_4(vec4 x)  { return x - floor(x*(1.0/289.0))*289.0; }
  vec4 permute4(vec4 x)  { return mod289_4(((x*34.0)+1.0)*x); }
  vec4 tis4(vec4 r)      { return 1.79284291400159 - 0.85373472095314*r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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
    vec4 p = permute4(permute4(permute4(
      i.z + vec4(0.0,i1.z,i2.z,1.0))
      + i.y + vec4(0.0,i1.y,i2.y,1.0))
      + i.x + vec4(0.0,i1.x,i2.x,1.0));
    float n_ = 0.142857142857;
    vec3  ns  = n_*D.wyz - D.xzx;
    vec4 j  = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 xx = x_*ns.x + ns.yyyy;
    vec4 yy = y_*ns.x + ns.yyyy;
    vec4 hh = 1.0 - abs(xx) - abs(yy);
    vec4 b0 = vec4(xx.xy, yy.xy);
    vec4 b1 = vec4(xx.zw, yy.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(hh, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,hh.x); vec3 p1 = vec3(a0.zw,hh.y);
    vec3 p2 = vec3(a1.xy,hh.z); vec3 p3 = vec3(a1.zw,hh.w);
    vec4 norm = tis4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m = m*m;
    return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    vUv       = uv;
    vGlyph    = aRnd.z;
    vWing     = aWing;
    vEye      = aEye;
    vProgress = uProgress;

    // Rain phase
    vec3 rain = aSrc;
    rain.y -= mod(uTime * aRnd.x * 2.2 + aRnd.y * 2.0, 12.0);

    // Mild turbulence during morph only
    float turbMag = sin(uProgress * 3.14159265) * 0.55;
    vec3 turb = vec3(
      snoise(aTgt * 0.6 + vec3(uTime*0.14, 0.0, 0.0)),
      snoise(aTgt * 0.6 + vec3(0.0, uTime*0.14, 0.0)),
      snoise(aTgt * 0.6 + vec3(0.0, 0.0, uTime*0.14))
    ) * turbMag;

    vec3 center = mix(rain, aTgt, uProgress) + turb;

    // Wing flap
    if (uProgress > 0.15 && aWing > 0.5) {
      float dx   = abs(aTgt.x);
      float wave = sin(dx * 1.2 - uTime * 2.2) * uWingAmp;
      center.y  += wave * dx * uProgress * 0.20;
      center.z  += wave * dx * uProgress * 0.05;
    }

    // Mouse repulsion
    if (uProgress > 0.5) {
      vec3  d = center - uMouse;
      float l = length(d);
      if (l < 2.0 && l > 0.001) {
        center += (d/l) * pow((2.0-l)/2.0, 2.0) * 0.75;
      }
    }

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
  varying float vWing;
  varying float vEye;
  varying float vProgress;

  void main() {
    float idx = floor(mod(vGlyph, uGrid.x*uGrid.y));
    float col = mod(idx, uGrid.x);
    float row = floor(idx / uGrid.x);
    vec2 atlasUv = vec2(
      (vUv.x + col) / uGrid.x,
      (uGrid.y - 1.0 - row + vUv.y) / uGrid.y
    );
    vec4 tex = texture2D(uAtlas, atlasUv);
    if (tex.a < 0.15) discard;

    vec3 cCyan   = vec3(0.0,   1.0,  0.8);
    vec3 cGold   = vec3(0.788, 0.663, 0.431);
    vec3 cSilver = vec3(0.784, 0.831, 0.910);
    vec3 cWhite  = vec3(1.0,   1.0,  1.0);

    vec3 swan = (vEye  > 0.5) ? cWhite
              : (vWing > 0.5) ? cGold
              :                 cSilver;

    vec3 color = mix(cCyan, swan, smoothstep(0.0, 0.6, vProgress));
    float fe   = pow(vEdge, 1.8);
    color     *= (1.0 - fe * 0.28);
    gl_FragColor = vec4(color, tex.a * (1.0 - fe * 0.52));
  }
`

// ─── Swan silhouette ───────────────────────────────────────────────────────────
//
//  Canvas: 600 × 500 px
//  Background: pure black #000000  → skip (r<10 && g<10 && b<10)
//  Wing/Beak:  pure red   #FF0000  → isWing = true
//  Body/Neck/Head/Tail: white #FFFFFF  → body particle
//  Eye:        bright cyan #00FFFF → isEye = true
//
//  Shapes and their canvas bounding boxes (no overlap between wing & body):
//    WING   : (0,110)–(265,310)   ← upper-left
//    BODY   : (130,310)–(490,490) ← lower-center (note: starts BELOW wing bottom)
//    TAIL   : (60,370)–(235,480)  ← lower-left extension
//    NECK   : stroke from (370,290) → (490,70), lw=38
//    HEAD   : (445,28)–(535,108)
//    BEAK   : (515,50)–(580,90)
//    EYE    : circle at (508,58) r=9

interface GeoData {
  src: Float32Array
  tgt: Float32Array
  rnd: Float32Array
  wng: Float32Array
  eye: Float32Array
}

function drawSwan(ctx: CanvasRenderingContext2D, CW: number, CH: number) {
  // ── WING (red) — upper-left, well above body ────────────────────────────────
  // Bounding box roughly (0,110)–(265,310). Body starts at y≈310 → NO OVERLAP.
  ctx.fillStyle = '#ff0000'
  ctx.save()
  ctx.translate(CW * 0.20, CH * 0.42)   // center (120, 210)
  ctx.rotate(-0.38)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.22, CH * 0.20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ── BODY (white) — lower-center, starts at y≈310 ───────────────────────────
  ctx.fillStyle = '#ffffff'
  ctx.save()
  ctx.translate(CW * 0.50, CH * 0.78)   // center (300, 390)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.30, CH * 0.16, -0.06, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ── TAIL (white) — lower-left ───────────────────────────────────────────────
  ctx.save()
  ctx.translate(CW * 0.22, CH * 0.84)   // center (132, 420)
  ctx.rotate(0.40)
  ctx.beginPath()
  ctx.ellipse(0, 0, CW * 0.14, CH * 0.09, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // ── NECK (white thick S-curve stroke) ──────────────────────────────────────
  // Base at top of body (370, 310→290), tip near head (490, 75)
  ctx.beginPath()
  ctx.moveTo(CW * 0.62, CH * 0.58)       // (372, 290) — top-right of body
  ctx.bezierCurveTo(
    CW * 0.68, CH * 0.44,                // (408, 220)
    CW * 0.74, CH * 0.28,                // (444, 140)
    CW * 0.79, CH * 0.15,                // (474, 75)  — neck top
  )
  ctx.lineWidth   = 36
  ctx.strokeStyle = '#ffffff'
  ctx.lineCap     = 'round'
  ctx.stroke()

  // ── HEAD (white oval) ───────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.ellipse(CW * 0.815, CH * 0.118, CW * 0.074, CH * 0.068, 0.20, 0, Math.PI * 2)
  ctx.fill()

  // ── BEAK (red → gold) ───────────────────────────────────────────────────────
  ctx.fillStyle = '#ff0000'
  ctx.beginPath()
  ctx.moveTo(CW * 0.878, CH * 0.092)
  ctx.lineTo(CW * 0.940, CH * 0.114)
  ctx.lineTo(CW * 0.878, CH * 0.136)
  ctx.closePath()
  ctx.fill()

  // ── EYE (cyan — distinct from white body AND red wing) ──────────────────────
  ctx.fillStyle = '#00ffff'
  ctx.beginPath()
  ctx.arc(CW * 0.838, CH * 0.100, 9, 0, Math.PI * 2)
  ctx.fill()
}

function buildGeoData(): GeoData {
  const CW = 600, CH = 500
  const cv = document.createElement('canvas')
  cv.width  = CW
  cv.height = CH
  const ctx = cv.getContext('2d')!

  // Pure black background — easiest to filter
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, CW, CH)
  drawSwan(ctx, CW, CH)

  const pixels = ctx.getImageData(0, 0, CW, CH).data
  const pool: { wx: number; wy: number; isWing: boolean; isEye: boolean }[] = []

  // World-space mapping:
  //   wx = (px/CW - 0.5) * 8.0   → −4 to +4
  //   wy = −(py/CH − 0.5) * 5.5 + 0.4  → +3.15 (top) to −2.35 (bottom)
  for (let py = 0; py < CH; py++) {
    for (let px = 0; px < CW; px++) {
      const i = (py * CW + px) * 4
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]

      // Skip pure black background
      if (r < 10 && g < 10 && b < 10) continue

      const wx = (px / CW - 0.5) * 8.0
      const wy = -(py / CH - 0.5) * 5.5 + 0.4

      // Classify by colour
      const isWing = r > 200 && g < 50  && b < 50    // red   → wing / beak
      const isEye  = r < 50  && g > 200 && b > 200   // cyan  → eye
      pool.push({ wx, wy, isWing, isEye })
    }
  }

  // Shuffle for uniform density
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
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

    const pt      = pool[i % pool.length]
    tgt[i*3]      = pt.wx + (Math.random() - 0.5) * 0.04
    tgt[i*3 + 1]  = pt.wy + (Math.random() - 0.5) * 0.04
    tgt[i*3 + 2]  = (Math.random() - 0.5) * 0.18
    wng[i]        = pt.isWing ? 1.0 : 0.0
    eye[i]        = pt.isEye  ? 1.0 : 0.0

    rnd[i*3]      = 0.65 + Math.random() * 1.9
    rnd[i*3 + 1]  = Math.random() * Math.PI * 2
    rnd[i*3 + 2]  = Math.floor(Math.random() * 25)
  }

  return { src, tgt, rnd, wng, eye }
}

// ─── Uniforms type ─────────────────────────────────────────────────────────────

interface Uniforms {
  [key: string]: { value: unknown }
  uProgress: { value: number }
  uTime:     { value: number }
  uWingAmp:  { value: number }
  uMouse:    { value: THREE.Vector3 }
  uAtlas:    { value: THREE.Texture | null }
  uGrid:     { value: THREE.Vector2 }
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

    const geo = new THREE.PlaneGeometry(0.10, 0.10)
    geo.setAttribute('aSrc',  new THREE.InstancedBufferAttribute(geoData.src, 3))
    geo.setAttribute('aTgt',  new THREE.InstancedBufferAttribute(geoData.tgt, 3))
    geo.setAttribute('aRnd',  new THREE.InstancedBufferAttribute(geoData.rnd, 3))
    geo.setAttribute('aWing', new THREE.InstancedBufferAttribute(geoData.wng, 1))
    geo.setAttribute('aEye',  new THREE.InstancedBufferAttribute(geoData.eye, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms:       u.current,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      side:           THREE.DoubleSide,
    })

    const mesh = new THREE.InstancedMesh(geo, mat, N)
    mesh.frustumCulled = false
    const identity = new THREE.Matrix4()
    for (let i = 0; i < N; i++) mesh.setMatrixAt(i, identity)
    mesh.instanceMatrix.needsUpdate = true

    groupRef.current.add(mesh)
    return () => {
      groupRef.current?.remove(mesh)
      geo.dispose()
      mat.dispose()
    }
  }, [atlas, geoData])

  useEffect(() => {
    const prog = isComplete ? 1.0 : isActive ? 0.90 : 0.0
    const amp  = isComplete ? 0.34 : isActive ? 0.22 : 0.0
    const t1 = gsap.to(u.current.uProgress, { value: prog, duration: 3.2, ease: 'power3.inOut' })
    const t2 = gsap.to(u.current.uWingAmp,  { value: amp,  duration: 2.8, ease: 'elastic.out(1,0.6)' })
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
    cam.fov = size.width < 500 ? 50.0 : 44.0
    // Look at vertical center of swan (world y ≈ 0.4)
    cam.position.set(0.0, 0.4, 7.0)
    cam.lookAt(0.0, 0.4, 0.0)
    cam.updateProjectionMatrix()
  }, [camera, size.width])

  useFrame(() => {
    camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.04
    camera.position.y += (0.4 + pointer.y * 0.18 - camera.position.y) * 0.04
    camera.lookAt(0.0, 0.4, 0.0)
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
      position:     'relative',
      width:        '100%',
      height:        300,
      borderRadius:  14,
      overflow:     'hidden',
      background:   '#07080C',
      border:       '1px solid rgba(255,255,255,0.06)',
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
          <Bloom intensity={1.4} luminanceThreshold={0.06} luminanceSmoothing={0.9} mipmapBlur />
        </EffectComposer>
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
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: dot, boxShadow: glow,
          transition: 'background 0.4s, box-shadow 0.4s',
        }} />
        <span style={{
          background:           'rgba(7,8,12,0.72)',
          backdropFilter:       'blur(16px) saturate(120%)',
          WebkitBackdropFilter: 'blur(16px) saturate(120%)',
          border:               '1px solid rgba(255,255,255,0.08)',
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

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 14, zIndex: 1,
        background: 'radial-gradient(ellipse at 50% 55%, transparent 35%, rgba(7,8,12,0.6) 100%)',
      }} />
    </div>
  )
}
