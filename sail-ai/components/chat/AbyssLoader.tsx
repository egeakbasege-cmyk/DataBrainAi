'use client'

/**
 * AbyssLoader — SwanReveal GPU Particle Morphing System
 * ──────────────────────────────────────────────────────────────────────────
 * Architecture:
 *   • All 9 500 particle positions computed entirely on GPU in vertex shader
 *   • Phase 1 — Matrix Rain:  vertex shader cascades particles from aSourcePosition
 *   • Phase 2 — Formation:    uProgress lerps + Simplex noise crystallisation path
 *   • Phase 3 — Wing Flap:    sinoid wave propagation when uProgress ≥ 0.95
 *   • instanceMatrix stays identity — shader does all morphing via custom attributes
 *   • Bloom post-processing (EffectComposer) for neon glow
 *
 * Interface (unchanged — ChatStage.tsx needs no edits):
 *   export function AbyssLoader({ modeLabel, isActive, isComplete })
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree }   from '@react-three/fiber'
import { EffectComposer, Bloom }        from '@react-three/postprocessing'
import * as THREE                       from 'three'
import gsap                             from 'gsap'

// ─── GLSL — Vertex Shader ─────────────────────────────────────────────────────
// GPU morphing: cascades source → target, Simplex noise along the path,
// then organic wing-wave once progress reaches the flap threshold.

const VERT = /* glsl */`
  uniform float uProgress;
  uniform float uTime;
  uniform float uWingAmplitude;
  uniform vec2  uAtlasGrid;

  attribute vec3  aSourcePosition;
  attribute vec3  aTargetPosition;
  attribute vec3  aRandoms;      // x: fall speed, y: noise phase, z: char index
  attribute float aIsWing;

  varying vec2  vUv;
  varying float vFresnel;
  varying float vCharIndex;

  // 3D Simplex Noise (Ashima Arts)
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0*C.xxx;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3  ns  = n_ * D.wyz - D.xzx;
    vec4 j  = p - 49.0*floor(p*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x  = x_*ns.x + ns.yyyy;
    vec4 y  = y_*ns.x + ns.yyyy;
    vec4 h  = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main(){
    vUv        = uv;
    vCharIndex = aRandoms.z;

    // Phase 1: cascade (rain)
    vec3 cascadePos  = aSourcePosition;
    cascadePos.y    -= mod(uTime * aRandoms.x * 4.0, 40.0);

    // Phase 2: noise-guided crystallisation toward target
    float noiseMag  = sin(uProgress * 3.14159265);
    vec3 noiseOff   = vec3(
      snoise(aTargetPosition * 0.5 + vec3(uTime,     0.0, 0.0)),
      snoise(aTargetPosition * 0.5 + vec3(0.0, uTime,     0.0)),
      snoise(aTargetPosition * 0.5 + vec3(0.0, 0.0,  uTime    ))
    ) * noiseMag * 1.5;

    vec3 mixedPos = mix(cascadePos, aTargetPosition, uProgress) + noiseOff;

    // Phase 3: organic wing-wave propagation
    if(uProgress > 0.1 && aIsWing > 0.5){
      float dist    = abs(aTargetPosition.x);
      float wave    = sin(dist * 1.8 - uTime * 3.0) * uWingAmplitude;
      mixedPos.y   += wave * dist * uProgress * 0.4;
      mixedPos.z   += wave * dist * uProgress * 0.1;
    }

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(mixedPos, 1.0);

    // Fresnel for edge-glow
    vec3 worldPos    = (modelMatrix * instanceMatrix * vec4(mixedPos, 1.0)).xyz;
    vec3 worldNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vec3 viewDir     = normalize(cameraPosition - worldPos);
    vFresnel         = pow(1.0 - max(dot(worldNormal, viewDir), 0.0), 3.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`

// ─── GLSL — Fragment Shader ───────────────────────────────────────────────────

const FRAG = /* glsl */`
  uniform sampler2D uTextureAtlas;
  uniform vec2      uAtlasGrid;

  varying vec2  vUv;
  varying float vFresnel;
  varying float vCharIndex;

  void main(){
    float numChars = uAtlasGrid.x * uAtlasGrid.y;
    float charIdx  = floor(mod(vCharIndex, numChars));
    float col      = mod(charIdx, uAtlasGrid.x);
    float row      = floor(charIdx / uAtlasGrid.x);

    vec2 charUv = vec2(
      (vUv.x + col) / uAtlasGrid.x,
      (1.0 - vUv.y + row) / uAtlasGrid.y
    );

    vec4 tex = texture2D(uTextureAtlas, charUv);
    if(tex.a < 0.1) discard;

    vec3 core = vec3(0.95, 0.95, 1.0);
    vec3 edge = vec3(0.0,  1.0,  0.8);   // #00ffcc
    vec3 col3 = mix(core, edge, vFresnel * 0.7);

    gl_FragColor = vec4(col3 * tex.rgb, tex.a * (0.4 + vFresnel * 0.6));
  }
`

// ─── Glyph Atlas ─────────────────────────────────────────────────────────────

function createFontAtlas(): THREE.CanvasTexture {
  const cv  = Object.assign(document.createElement('canvas'), { width: 512, height: 512 })
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, 512, 512)
  ctx.font         = 'bold 110px "JetBrains Mono","Courier New",monospace'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = '#ffffff'

  const glyphs = ['0','1','$','@','&','X','S','#','%','?','Z','K']
  glyphs.forEach((g, i) => {
    ctx.fillText(g, (i % 3) * 170 + 85, Math.floor(i / 3) * 128 + 64)
  })

  const tex = new THREE.CanvasTexture(cv)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

// ─── Constants ────────────────────────────────────────────────────────────────

const N = 9_500

// ─── SwanScene ────────────────────────────────────────────────────────────────

interface SceneProps { isActive: boolean; isComplete: boolean }

function SwanScene({ isActive, isComplete }: SceneProps) {
  const meshRef     = useRef<THREE.InstancedMesh>(null!)
  const uniformsRef = useRef({
    uProgress:     { value: 0 },
    uTime:         { value: 0 },
    uWingAmplitude:{ value: 0 },
    uTextureAtlas: { value: null as THREE.Texture | null },
    uAtlasGrid:    { value: new THREE.Vector2(3, 4) },
  })

  // ── Build geometry + material once ────────────────────────────────────────
  const { geo, mat } = useMemo(() => {
    const atlas = createFontAtlas()
    uniformsRef.current.uTextureAtlas.value = atlas

    // Source positions (rain start — high up, spread wide)
    const src  = new Float32Array(N * 3)
    // Target positions (swan silhouette)
    const tgt  = new Float32Array(N * 3)
    const rnd  = new Float32Array(N * 3)
    const wing = new Float32Array(N)

    // Spine curve: S-curve neck
    const spinePts: THREE.Vector3[] = []
    for (let i = 0; i < 30; i++) {
      const t = i / 29
      spinePts.push(new THREE.Vector3(
        Math.sin(t * Math.PI * 1.5) * 0.4,
        t * 4.5 - 2.0,
        Math.cos(t * Math.PI) * 0.25,
      ))
    }
    const spine = new THREE.CatmullRomCurve3(spinePts)

    for (let i = 0; i < N; i++) {
      // Rain start
      src[i*3]   = (Math.random() - 0.5) * 25
      src[i*3+1] = Math.random() * 15 + 10
      src[i*3+2] = (Math.random() - 0.5) * 15

      // Swan target
      const f = Math.random()
      if (f < 0.25) {
        // Neck / spine
        const pt = spine.getPointAt(Math.random())
        tgt[i*3]   = pt.x + (Math.random() - 0.5) * 0.2
        tgt[i*3+1] = pt.y + (Math.random() - 0.5) * 0.2
        tgt[i*3+2] = pt.z + (Math.random() - 0.5) * 0.2
        wing[i] = 0
      } else {
        // Wings (symmetric)
        const side  = Math.random() > 0.5 ? 1 : -1
        const sweep = Math.pow(Math.random(), 0.7) * 3.5
        tgt[i*3]   = side * (0.3 + sweep)
        tgt[i*3+1] = -0.5 + Math.random() * 1.2 + sweep * 0.4
        tgt[i*3+2] = (Math.random() - 0.5) * 0.8 - sweep * 0.3
        wing[i] = 1
      }

      // Per-particle randoms
      rnd[i*3]   = 0.8 + Math.random() * 1.5   // fall speed
      rnd[i*3+1] = Math.random() * Math.PI * 2  // noise phase
      rnd[i*3+2] = Math.floor(Math.random() * 12) // glyph index
    }

    const g = new THREE.PlaneGeometry(0.09, 0.09)
    g.setAttribute('aSourcePosition', new THREE.InstancedBufferAttribute(src,  3))
    g.setAttribute('aTargetPosition', new THREE.InstancedBufferAttribute(tgt,  3))
    g.setAttribute('aRandoms',        new THREE.InstancedBufferAttribute(rnd,  3))
    g.setAttribute('aIsWing',         new THREE.InstancedBufferAttribute(wing, 1))

    const m = new THREE.ShaderMaterial({
      uniforms:       uniformsRef.current,
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    return { geo: g, mat: m }
  }, [])

  // Dispose on unmount
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  // Seed all instance matrices to identity
  useEffect(() => {
    const id = new THREE.Matrix4()
    for (let i = 0; i < N; i++) meshRef.current.setMatrixAt(i, id)
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])

  // Drive progress and wing amplitude with GSAP whenever props change
  useEffect(() => {
    const target = isComplete ? 1.0 : isActive ? 0.82 : 0.02
    const amp    = isComplete ? 0.35 : isActive ? 0.28 : 0.0

    gsap.to(uniformsRef.current.uProgress,      { value: target, duration: 3.5, ease: 'power3.inOut' })
    gsap.to(uniformsRef.current.uWingAmplitude, { value: amp,    duration: 2.5, ease: 'elastic.out(1, 0.5)' })
  }, [isActive, isComplete])

  // Clock → shader
  useFrame(({ clock }) => {
    uniformsRef.current.uTime.value = clock.getElapsedTime()
  })

  return <instancedMesh ref={meshRef} args={[geo, mat, N]} frustumCulled={false} />
}

// ─── Responsive Camera ────────────────────────────────────────────────────────

function CameraAdapter() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    // Wide FOV for narrow card containers; pull back for extra width
    cam.fov = size.width < 500 ? 65 : size.width < 900 ? 55 : 46
    cam.position.set(0, 0.8, 7.5)
    cam.lookAt(0, 0.5, 0)
    cam.updateProjectionMatrix()
  }, [camera, size.width])
  return null
}

// ─── AbyssLoader (named export — matches ChatStage.tsx import) ────────────────

interface AbyssProps {
  modeLabel:  string
  isActive:   boolean
  isComplete: boolean
}

export function AbyssLoader({ modeLabel, isActive, isComplete }: AbyssProps) {
  const dotColor = isComplete ? '#C9A96E' : '#00ffcc'
  const status   = isActive   ? `${modeLabel} · Analysing…`
                 : isComplete ? `${modeLabel} · Complete`
                 :              `${modeLabel} · Standby`

  return (
    <div
      style={{
        position:     'relative',
        width:        '100%',
        height:        300,
        borderRadius:  16,
        overflow:     'hidden',
        background:   '#03050a',
        border:       '1px solid rgba(255,255,255,0.06)',
        boxShadow:    '0 2px 32px rgba(0,0,0,0.72)',
      }}
    >
      {/* ── R3F Canvas — z-index: 0 ────────────────────────────────────── */}
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        camera={{ position: [0, 0.8, 7.5], fov: 46 }}
        dpr={[1, 2]}
        gl={{
          antialias:           false,
          alpha:               false,
          powerPreference:     'high-performance',
          preserveDrawingBuffer: false,
        }}
      >
        <CameraAdapter />
        <SwanScene isActive={isActive} isComplete={isComplete} />
        <EffectComposer>
          <Bloom
            intensity={1.8}
            luminanceThreshold={0.12}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>

      {/* ── Vignette ────────────────────────────────────────────────────── */}
      <div
        style={{
          position:      'absolute',
          inset:          0,
          zIndex:         1,
          pointerEvents: 'none',
          background:    'radial-gradient(ellipse at center, transparent 30%, rgba(3,5,10,0.6) 100%)',
        }}
      />

      {/* ── Status bar — z-index: 10, glassmorphism ─────────────────────── */}
      <div
        style={{
          position:       'absolute',
          top:             12,
          left:            14,
          right:           14,
          zIndex:          10,
          display:        'flex',
          alignItems:     'center',
          gap:             8,
          pointerEvents:  'none',
        }}
      >
        <span
          style={{
            display:      'inline-block',
            width:         6,
            height:        6,
            borderRadius: '50%',
            flexShrink:    0,
            background:   dotColor,
            boxShadow:    `0 0 10px ${dotColor}aa`,
            animation:    'abyss-pulse 1.1s ease-in-out infinite',
            transition:   'background 0.4s',
          }}
        />
        <span
          style={{
            background:           'rgba(6, 11, 25, 0.40)',
            backdropFilter:       'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border:               '1px solid rgba(255,255,255,0.05)',
            borderRadius:          8,
            padding:              '3px 12px',
            color:                `${dotColor}cc`,
            fontSize:              11,
            fontFamily:           '"JetBrains Mono","Courier New",monospace',
            letterSpacing:        '0.14em',
            fontWeight:            600,
            transition:           'color 0.4s',
          }}
        >
          {status}
        </span>
      </div>

      <style>{`
        @keyframes abyss-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:.35; transform:scale(1.65); }
        }
      `}</style>
    </div>
  )
}
