'use client'

/**
 * AbyssLoader — Code-glyph swan particle system
 *
 * Architecture:
 *   • InstancedMesh<PlaneGeometry> — one quad per particle, GPU-instanced
 *   • Custom ShaderMaterial         — simplex noise morphing, wing flap, mouse repulsion
 *   • Billboard vertex trick        — add position.xy in view space so quads face camera
 *   • Canvas atlas 5×5              — 25 code glyphs; correct flipY UV formula
 *   • GSAP tweens uProgress / uWingAmp uniforms; cleanup on unmount / prop change
 *   • Adaptive particle count       — halved on mobile / low-core CPUs
 *   • Fully imperative Three.js     — no R3F JSX args[] type battles
 *
 * Export: AbyssLoader({ modeLabel, isActive, isComplete })
 */

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree }           from '@react-three/fiber'
import * as THREE                               from 'three'
import gsap                                     from 'gsap'

// ─── Adaptive N ───────────────────────────────────────────────────────────────

const N = (() => {
  if (typeof navigator === 'undefined') return 8_000
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return 4_000
  const c = navigator.hardwareConcurrency ?? 4
  return c <= 4 ? 5_500 : c <= 8 ? 8_500 : 11_000
})()

// ─── Atlas (5 × 5 code glyphs) ───────────────────────────────────────────────

const ATLAS_COLS = 5
const ATLAS_ROWS = 5

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

  const cw = SIZE / ATLAS_COLS
  const ch = SIZE / ATLAS_ROWS
  glyphs.forEach((g, i) => {
    ctx.fillText(g, (i % ATLAS_COLS) * cw + cw / 2, Math.floor(i / ATLAS_COLS) * ch + ch / 2)
  })

  const tex             = new THREE.CanvasTexture(cv)
  tex.anisotropy        = 8
  tex.minFilter         = THREE.LinearMipmapLinearFilter
  tex.magFilter         = THREE.LinearFilter
  tex.generateMipmaps   = true
  return tex
}

// ─── GLSL ─────────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
  uniform float uProgress;
  uniform float uTime;
  uniform float uWingAmp;
  uniform vec3  uMouse;

  attribute vec3  aSrc;    // rain start world position
  attribute vec3  aTgt;    // swan target world position
  attribute vec3  aRnd;    // x: fall speed  y: phase  z: glyph index (0-24)
  attribute float aWing;   // 1.0 = wing particle

  varying vec2  vUv;
  varying float vEdge;
  varying float vGlyph;

  // ── Compact 3D Simplex Noise ──────────────────────────────────────────────
  vec4 spm(vec4 x){ return mod(((x*34.)+1.)*x,289.); }
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy)), x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz), l=1.-g;
    vec3 i1=min(g.xyz,l.zxy), i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx, x2=x0-i2+2.*C.xxx, x3=x0-D.yyy;
    i=mod(i,289.);
    vec4 p=spm(spm(spm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    vec3 ns=.142857142857*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z), xf=floor(j*ns.z), yf=floor(j-7.*xf);
    vec4 xx=xf*ns.x+ns.yyyy, yy=yf*ns.x+ns.yyyy, hh=1.-abs(xx)-abs(yy);
    vec4 b0=vec4(xx.xy,yy.xy), b1=vec4(xx.zw,yy.zw);
    vec4 s0=floor(b0)*2.+1., s1=floor(b1)*2.+1., sh=-step(hh,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy, a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,hh.x), p1=vec3(a0.zw,hh.y), p2=vec3(a1.xy,hh.z), p3=vec3(a1.zw,hh.w);
    vec4 nm=1.79284291400159-.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
    p0*=nm.x; p1*=nm.y; p2*=nm.z; p3*=nm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m*=m;
    return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    vUv   = uv;
    vGlyph = aRnd.z;

    // ── Phase 1: code rain (particles fall from high y, wrap at bottom) ──────
    vec3 rain = aSrc;
    rain.y -= mod(uTime * aRnd.x * 2.5, 40.0);

    // ── Phase 2: turbulence peak at progress = 0.5, quiet at 0 and 1 ────────
    float turbMag = sin(uProgress * 3.14159265);
    vec3 turb = vec3(
      snoise(aTgt * 0.4 + vec3(uTime * 0.18, 0., 0.)),
      snoise(aTgt * 0.4 + vec3(0., uTime * 0.18, 0.)),
      snoise(aTgt * 0.4 + vec3(0., 0., uTime * 0.18))
    ) * turbMag * 1.1;

    // World-space particle centre
    vec3 center = mix(rain, aTgt, uProgress) + turb;

    // ── Phase 3: wing flap once formation is near complete ───────────────────
    if (uProgress > 0.1 && aWing > 0.5) {
      float dx    = abs(aTgt.x);
      float wave  = sin(dx * 1.5 - uTime * 2.0) * uWingAmp;
      center.y   += wave * dx * uProgress * 0.30;
      center.z   += wave * dx * uProgress * 0.08;
    }

    // ── Phase 4: magnetic mouse repulsion (active when mostly formed) ────────
    if (uProgress > 0.5) {
      vec3  delta = center - uMouse;
      float d     = length(delta);
      if (d < 2.5 && d > 0.001) {
        float f  = pow((2.5 - d) / 2.5, 2.0);
        center  += (delta / d) * f * 0.85;
      }
    }

    // ── Billboard: transform centre to view space, add local vertex offset ───
    // This makes every quad face the camera regardless of rotation.
    vec4 mvCenter = modelViewMatrix * vec4(center, 1.0);
    vec4 mvPos    = mvCenter + vec4(position.xy, 0.0, 0.0);
    gl_Position   = projectionMatrix * mvPos;

    // Edge factor for ink-edge colour blend (0 = centre, 1 = corner)
    vEdge = clamp(length(uv - 0.5) * 2.0, 0.0, 1.0);
  }
`

const FRAG = /* glsl */`
  uniform sampler2D uAtlas;
  uniform vec2      uGrid;    // (cols, rows) = (5, 5)

  varying vec2  vUv;
  varying float vEdge;
  varying float vGlyph;

  void main() {
    float total = uGrid.x * uGrid.y;
    float idx   = floor(mod(vGlyph, total));
    float col   = mod(idx, uGrid.x);
    float row   = floor(idx / uGrid.x);

    // CanvasTexture has flipY = true by default:
    //   canvas row 0 (top) maps to UV v = 1
    //   canvas row R spans UV v: [(rows-1-R)/rows , (rows-R)/rows]
    // Therefore: atlasV = (rows - 1 - row + vUv.y) / rows
    vec2 atlasUv = vec2(
      (vUv.x + col) / uGrid.x,
      (uGrid.y - 1.0 - row + vUv.y) / uGrid.y
    );

    vec4 tex = texture2D(uAtlas, atlasUv);
    if (tex.a < 0.15) discard;

    // Ink palette: near-black core → subtle blue on glyph edges
    vec3 inkCore  = vec3(0.05, 0.05, 0.08);
    vec3 inkEdge  = vec3(0.10, 0.24, 0.54);
    float fe      = pow(vEdge, 1.6);
    vec3 color    = mix(inkCore, inkEdge, fe * 0.48);
    float alpha   = tex.a * (0.88 + fe * 0.12);

    gl_FragColor  = vec4(color, alpha);
  }
`

// ─── Particle geometry data ────────────────────────────────────────────────────

interface GeoData {
  src: Float32Array  // rain start positions  N×3
  tgt: Float32Array  // swan target positions  N×3
  rnd: Float32Array  // randomness            N×3
  wng: Float32Array  // wing flag             N×1
}

function buildGeoData(): GeoData {
  const src = new Float32Array(N * 3)
  const tgt = new Float32Array(N * 3)
  const rnd = new Float32Array(N * 3)
  const wng = new Float32Array(N)

  // Swan spine — S-curve from bottom to top
  const spine = new THREE.CatmullRomCurve3(
    Array.from({ length: 35 }, (_, i) => {
      const t = i / 34
      return new THREE.Vector3(
        Math.sin(t * Math.PI * 1.5) * 0.38,
        t * 4.6 - 2.3,
        Math.cos(t * Math.PI) * 0.28,
      )
    })
  )

  for (let i = 0; i < N; i++) {
    // Rain start: scattered above the visible area
    src[i*3]     = (Math.random() - .5) * 28
    src[i*3 + 1] = Math.random() * 22 + 10
    src[i*3 + 2] = (Math.random() - .5) * 16

    const roll = Math.random()

    if (roll < 0.28) {
      // ── Body / neck along spine ──────────────────────────────────────────
      const pt     = spine.getPointAt(Math.random())
      tgt[i*3]     = pt.x + (Math.random() - .5) * .22
      tgt[i*3 + 1] = pt.y + (Math.random() - .5) * .22
      tgt[i*3 + 2] = pt.z + (Math.random() - .5) * .22
      wng[i] = 0
    } else {
      // ── Wings (symmetric, power-law sweep) ──────────────────────────────
      const side   = Math.random() > .5 ? 1 : -1
      const sweep  = Math.pow(Math.random(), .70) * 3.8
      tgt[i*3]     = side * (.30 + sweep)
      tgt[i*3 + 1] = -.55 + Math.random() * 1.4 + sweep * .42
      tgt[i*3 + 2] = (Math.random() - .5) * .90 - sweep * .30
      wng[i] = 1
    }

    rnd[i*3]     = .65 + Math.random() * 1.9   // fall speed
    rnd[i*3 + 1] = Math.random() * Math.PI * 2  // phase offset
    rnd[i*3 + 2] = Math.floor(Math.random() * 25) // glyph index 0-24
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

// ─── SwanScene (inside Canvas) ────────────────────────────────────────────────

function SwanScene({ isActive, isComplete }: { isActive: boolean; isComplete: boolean }) {
  const groupRef    = useRef<THREE.Group>(null!)
  const { pointer, viewport } = useThree()

  // Atlas — created once on client
  const [atlas, setAtlas] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const t = makeAtlas()
    setAtlas(t)
    return () => t.dispose()
  }, [])

  // Geometry data — computed once
  const geoData = useMemo<GeoData>(() => buildGeoData(), [])

  // Uniforms — stable object, mutated in-place each frame
  const u = useRef<Uniforms>({
    uProgress: { value: 0 },
    uTime:     { value: 0 },
    uWingAmp:  { value: 0 },
    uMouse:    { value: new THREE.Vector3() },
    uAtlas:    { value: null },
    uGrid:     { value: new THREE.Vector2(ATLAS_COLS, ATLAS_ROWS) },
  })

  // Wire atlas into uniforms when ready
  useEffect(() => { u.current.uAtlas.value = atlas }, [atlas])

  // Build InstancedMesh imperatively after atlas loads
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

    groupRef.current.add(mesh)

    return () => {
      groupRef.current?.remove(mesh)
      geo.dispose()
      mat.dispose()
    }
  }, [atlas, geoData])

  // GSAP-driven progress & wing amplitude
  useEffect(() => {
    const prog = isComplete ? 1.0 : isActive ? 0.86 : 0.0
    const amp  = isComplete ? 0.38 : isActive ? 0.26 : 0.0
    const t1   = gsap.to(u.current.uProgress, { value: prog, duration: 3.5, ease: 'power3.inOut' })
    const t2   = gsap.to(u.current.uWingAmp,  { value: amp,  duration: 3.0, ease: 'elastic.out(1,0.6)' })
    return () => { t1.kill(); t2.kill() }
  }, [isActive, isComplete])

  // Zero-allocation per-frame update
  const mouseTarget = useRef(new THREE.Vector3())
  useFrame(({ clock }) => {
    u.current.uTime.value = clock.getElapsedTime()
    mouseTarget.current.set(
      (pointer.x * viewport.width)  / 2,
      (pointer.y * viewport.height) / 2,
      0,
    )
    u.current.uMouse.value.lerp(mouseTarget.current, 0.08)
  })

  return <group ref={groupRef} />
}

// ─── Camera with mouse parallax ────────────────────────────────────────────────

function CameraRig() {
  const { camera, size, pointer } = useThree()

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = size.width < 500 ? 48 : 42
    cam.position.set(0, 1.0, 7.0)
    cam.lookAt(0, 0.8, 0)
    cam.updateProjectionMatrix()
  }, [camera, size.width])

  useFrame(() => {
    camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04
    camera.position.y += (1.0 + pointer.y * 0.25 - camera.position.y) * 0.04
    camera.lookAt(0, 0.8, 0)
  })

  return null
}

// ─── Public component ─────────────────────────────────────────────────────────

interface AbyssProps {
  modeLabel:  string
  isActive:   boolean
  isComplete: boolean
}

export function AbyssLoader({ modeLabel, isActive, isComplete }: AbyssProps) {
  const dot    = isComplete ? '#059669' : isActive ? '#0055ff' : 'rgba(0,0,0,0.22)'
  const glow   = isActive || isComplete ? `0 0 8px ${dot}` : 'none'
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
        position:   'absolute',
        top:         10,
        left:        12,
        right:       12,
        zIndex:      10,
        display:    'flex',
        alignItems: 'center',
        gap:         8,
        pointerEvents: 'none',
      }}>
        <span style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   dot,
          boxShadow:    glow,
          flexShrink:   0,
          transition:  'background .4s, box-shadow .4s',
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

      {/* Subtle inner vignette */}
      <div style={{
        position:     'absolute',
        inset:         0,
        pointerEvents:'none',
        borderRadius:  14,
        boxShadow:    'inset 0 0 48px rgba(250,250,248,0.55)',
        zIndex:        1,
      }} />
    </div>
  )
}
