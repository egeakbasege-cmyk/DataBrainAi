/**
 * components/landing/PortofinoScene.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Three.js Portofino harbor — the living background of the landing page.
 *
 * Architecture:
 *   Sky      — drei Sky (Rayleigh scattering, sun shifts midnight→golden-hour)
 *   Water    — custom GLSL shader (2-layer simplex waves, Fresnel, champagne specular)
 *   Harbor   — procedural Italian buildings (terracotta/cream/salmon), hill terrain,
 *              church campanile, pier, flag poles
 *   Sailboat — moves along CatmullRomCurve3 as the user advances through the SAIL AI demo
 *   iPhone   — replaces the mainsail; glows softly to signal the app inside
 *
 * Progress source: useNarrative (Zustand) — maps narrative node → boat position (0→1)
 * All uniforms update in useFrame (no React re-renders inside the Canvas)
 * dynamically imported (ssr: false) — pure client, no hydration issues
 */
'use client'

import dynamic                              from 'next/dynamic'
import { useRef, useMemo, useEffect }       from 'react'
import { useFrame }                         from '@react-three/fiber'
import { Sky }                              from '@react-three/drei'
import * as THREE                           from 'three'
import { useNarrative, NODE_ORDER }         from './narrativeStore'

// ── GLSL: Water vertex — 4-component Gerstner with uWaveScale ────────────────

const WATER_VERT = /* glsl */`
precision highp float;

uniform float uTime;
uniform float uWaveScale;

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;
varying vec3  vNormal;

struct GWave { vec2 dir; float amp; float freq; float speed; float steep; };

vec3 gerstner(GWave w, vec2 xz, float t, inout vec3 tangent, inout vec3 bitangent) {
  float phi    = w.freq * dot(w.dir, xz) + w.speed * t;
  float sinPhi = sin(phi);
  float cosPhi = cos(phi);
  float QAk    = w.steep * w.amp * w.freq;

  tangent   += vec3(
    -QAk * w.dir.x * w.dir.x * sinPhi,
     w.amp * w.freq * w.dir.x * cosPhi,
    -QAk * w.dir.x * w.dir.y * sinPhi
  );
  bitangent += vec3(
    -QAk * w.dir.x * w.dir.y * sinPhi,
     w.amp * w.freq * w.dir.y * cosPhi,
    -QAk * w.dir.y * w.dir.y * sinPhi
  );

  return vec3(
    w.steep * w.amp * w.dir.x * cosPhi,
    w.amp  * sinPhi,
    w.steep * w.amp * w.dir.y * cosPhi
  );
}

void main() {
  vUv      = uv;
  vec2  xz = vec2(position.x, position.z) * uWaveScale;

  GWave w0 = GWave(normalize(vec2( 1.0,  0.6)), 0.19, 0.52, 1.14, 0.48);
  GWave w1 = GWave(normalize(vec2(-0.3,  1.0)), 0.11, 0.79, 1.39, 0.38);
  GWave w2 = GWave(normalize(vec2( 0.8, -0.5)), 0.07, 1.57, 1.97, 0.28);
  GWave w3 = GWave(normalize(vec2(-0.5, -0.8)), 0.04, 2.51, 2.49, 0.22);

  vec3 tangent   = vec3(1.0, 0.0, 0.0);
  vec3 bitangent = vec3(0.0, 0.0, 1.0);
  vec3 disp      = vec3(0.0);

  disp += gerstner(w0, xz, uTime, tangent, bitangent);
  disp += gerstner(w1, xz, uTime, tangent, bitangent);
  disp += gerstner(w2, xz, uTime, tangent, bitangent);
  disp += gerstner(w3, xz, uTime, tangent, bitangent);

  vec3 pos   = position + disp;
  vElevation = disp.y;
  vNormal    = normalize(cross(bitangent, tangent));

  vec4 world4 = modelMatrix * vec4(pos, 1.0);
  vWorldPos   = world4.xyz;
  gl_Position = projectionMatrix * viewMatrix * world4;
}
`

// ── GLSL: Water fragment — Fresnel + SSS + dual specular ─────────────────────

const WATER_FRAG = /* glsl */`
precision highp float;

uniform vec3  uDeepColor;
uniform vec3  uSurfaceColor;
uniform vec3  uSunDir;
uniform float uProgress;
uniform float uShoreZ;   // world-Z of the seawall — water fades to 0 here

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;
varying vec3  vNormal;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);

  // Base water colour — deep navy → surface teal
  float t     = clamp((vElevation + 0.32) * 2.2, 0.0, 1.0);
  vec3  water = mix(uDeepColor, uSurfaceColor, t);

  // Golden-hour tint grows with boat progress
  water = mix(water, water * vec3(1.20, 0.94, 0.68), uProgress * 0.65);

  // Fresnel sky reflection
  float cosTheta = max(dot(N, V), 0.0);
  float fresnel  = 0.04 + 0.96 * pow(1.0 - cosTheta, 4.5);
  float skyBlend = clamp(N.y * 1.5, 0.0, 1.0);
  vec3  skyTop   = mix(vec3(0.55, 0.74, 0.92), vec3(0.70, 0.50, 0.28), uProgress * 0.7);
  vec3  skyHoriz = mix(vec3(0.75, 0.88, 0.98), vec3(0.85, 0.65, 0.35), uProgress * 0.7);
  vec3  skyRefl  = mix(skyHoriz, skyTop, skyBlend);
  water          = mix(water, skyRefl, fresnel * 0.62);

  // Champagne-gold sun specular (sharp primary lobe)
  vec3  H      = normalize(uSunDir + V);
  float spec   = pow(max(dot(N, H), 0.0), 180.0);
  vec3  goldSpec = mix(vec3(0.97, 0.88, 0.50), vec3(0.98, 0.65, 0.28), uProgress);
  water         += goldSpec * spec * mix(0.60, 1.40, uProgress);

  // Secondary broader specular lobe (adds depth/wetness)
  float spec2 = pow(max(dot(N, H), 0.0), 28.0);
  water       += goldSpec * spec2 * mix(0.08, 0.18, uProgress);

  // Crest foam
  float foam = smoothstep(0.24, 0.40, vElevation);
  water = mix(water, vec3(0.97, 0.99, 1.0), foam * 0.32);

  // Subsurface scatter — subtle teal glow at grazing angles
  float sss  = pow(max(1.0 - cosTheta, 0.0), 2.5) * 0.15;
  water      += vec3(0.10, 0.30, 0.28) * sss;

  // Horizon atmospheric depth fade
  float horizon = smoothstep(0.20, 0.70, vUv.y);
  water = mix(water * 0.55, water, horizon);

  // Shore cut-off — water fades to transparent at the seawall edge.
  // smoothstep: 0 when worldZ < uShoreZ-1.5 (behind wall), 1 when worldZ > uShoreZ+1.5 (open sea)
  float shoreFade = smoothstep(uShoreZ - 1.5, uShoreZ + 1.5, vWorldPos.z);

  gl_FragColor = vec4(water, mix(0.90, 0.97, horizon) * shoreFade);
}
`

// ── GLSL: Wake foam (animated V-trail behind sailboat) ───────────────────────

const WAKE_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv         = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const WAKE_FRAG = /* glsl */`
precision highp float;
uniform float uTime;
varying vec2  vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1,0)), u.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

void main() {
  float cx    = abs(vUv.x - 0.5) * 2.0;
  float vShape = 1.0 - smoothstep(0.0, 0.18, cx - vUv.y * 0.9);
  float n1    = vnoise(vUv * vec2(6.0, 14.0) + vec2(0.0, -uTime * 1.8));
  float n2    = vnoise(vUv * vec2(14.0, 28.0) + vec2(uTime * 0.6, -uTime * 2.4));
  float foam  = (n1 * 0.55 + n2 * 0.45) * vShape;
  float alpha = foam * (1.0 - vUv.y * 0.8) * 0.55;
  gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(alpha, 0.0, 1.0));
}
`

// ── Canvas building texture — rich Portofino stucco, deep-green shutters ──────

function makeWallTexture(baseHex: string, floors = 4, cols = 3): THREE.CanvasTexture {
  const W = 256, H = 512
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!

  // Base plaster — keep the colour vibrant
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, W, H)

  // Subtle sun-bleaching on upper half, damp shadow at base
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0.0, 'rgba(255,255,255,0.10)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0.0)')
  grad.addColorStop(1.0, 'rgba(0,0,0,0.18)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Horizontal stucco scoring (lighter — keeps colours popping)
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'
  ctx.lineWidth = 1
  for (let y = 16; y < H; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  // Ground floor: painted arcade stripe (slightly darker band at base)
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fillRect(0, H * 0.82, W, H * 0.18)

  // Windows with frames, mullions, shutters
  const cellW = W / cols,  cellH = H / floors
  const winW  = cellW * 0.38, winH = cellH * 0.42
  const shuW  = winW  * 0.42

  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cellW + (cellW - winW) / 2
      const wy = r * cellH + cellH * 0.18

      // Stone sill — bright ledge
      ctx.fillStyle = 'rgba(255,255,255,0.28)'
      ctx.fillRect(wx - 4, wy + winH, winW + 8, 5)

      // Plaster window surround (slightly lighter than wall)
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fillRect(wx - 5, wy - 5, winW + 10, winH + 10)

      // Dark frame
      ctx.fillStyle = '#2E1C0A'
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4)

      // Glass — warm Mediterranean sky reflection
      ctx.fillStyle = '#5A8FB8'
      ctx.fillRect(wx, wy, winW, winH)

      // Glass highlight
      const ghi = ctx.createLinearGradient(wx, wy, wx + winW * 0.5, wy + winH * 0.5)
      ghi.addColorStop(0, 'rgba(255,255,255,0.22)')
      ghi.addColorStop(1, 'rgba(0,0,0,0.0)')
      ctx.fillStyle = ghi
      ctx.fillRect(wx, wy, winW, winH)

      // Inner shadow
      const gsh = ctx.createLinearGradient(wx, wy, wx + winW, wy + winH)
      gsh.addColorStop(0,   'rgba(0,0,0,0.28)')
      gsh.addColorStop(0.5, 'rgba(0,0,0,0.0)')
      gsh.addColorStop(1,   'rgba(0,0,0,0.12)')
      ctx.fillStyle = gsh
      ctx.fillRect(wx, wy, winW, winH)

      // Mullions
      ctx.fillStyle = '#2E1C0A'
      ctx.fillRect(wx + winW / 2 - 1, wy, 2, winH)
      ctx.fillRect(wx, wy + winH / 2 - 1, winW, 2)

      // ── Portofino-green shutters (the defining visual) ──
      const shutterGreen = r === floors - 1 ? '#3A6E28' : '#2A5E20'  // lighter on top floor
      ctx.fillStyle = shutterGreen
      ctx.fillRect(wx - shuW - 3, wy, shuW, winH)
      ctx.fillRect(wx + winW + 3,  wy, shuW, winH)

      // Shutter slats — horizontal louvres
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      const slats = 6
      for (let s = 1; s < slats; s++) {
        const sy = wy + (s / slats) * winH
        ctx.beginPath(); ctx.moveTo(wx - shuW - 3, sy); ctx.lineTo(wx - 3, sy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(wx + winW + 3, sy); ctx.lineTo(wx + winW + 3 + shuW, sy); ctx.stroke()
      }
      // Shutter highlight edge
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      ctx.strokeRect(wx - shuW - 3, wy, shuW, winH)
      ctx.strokeRect(wx + winW + 3, wy, shuW, winH)
    }
  }

  return new THREE.CanvasTexture(cv)
}

// ── Water component ───────────────────────────────────────────────────────────

function WaterSurface() {
  const { node } = useNarrative()
  const progressRef = useRef(0)

  const uniforms = useMemo(() => ({
    uTime:         { value: 0.0 },
    uWaveScale:    { value: 0.38 },
    uProgress:     { value: 0.0 },
    uDeepColor:    { value: new THREE.Color('#062434') },   // Ligurian deep teal-navy
    uSurfaceColor: { value: new THREE.Color('#0E9E8C') },   // warm Mediterranean surface
    uSunDir:       { value: new THREE.Vector3(0.55, 0.72, -0.42).normalize() },
    uShoreZ:       { value: -9.5 },   // seawall front edge in world-Z
  }), [])

  useEffect(() => {
    progressRef.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(({ clock }) => {
    uniforms.uTime.value      = clock.getElapsedTime()
    uniforms.uProgress.value += (progressRef.current - uniforms.uProgress.value) * 0.006
    const pp = uniforms.uProgress.value
    uniforms.uSunDir.value.set(
      0.55 - pp * 0.40,
      0.72 - pp * 0.35,
      -0.42 + pp * 0.12,
    ).normalize()
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow>
      <planeGeometry args={[90, 70, 180, 180]} />
      <shaderMaterial
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Wake foam trail (sits behind sailboat) ────────────────────────────────────

function WakeTrail() {
  const uniforms = useMemo(() => ({ uTime: { value: 0.0 } }), [])
  useFrame(({ clock }) => { uniforms.uTime.value = clock.getElapsedTime() })
  // Two wake trails — one per hull
  return (
    <>
      <mesh position={[-1.7, -0.78, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 8, 1, 1]} />
        <shaderMaterial vertexShader={WAKE_VERT} fragmentShader={WAKE_FRAG} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.7, -0.78, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 8, 1, 1]} />
        <shaderMaterial vertexShader={WAKE_VERT} fragmentShader={WAKE_FRAG} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// ── Harbor buildings ──────────────────────────────────────────────────────────

interface BuildingCfg {
  x: number; z: number
  w: number; h: number; d: number
  color: string
  floors?: number; cols?: number
  rowY?: number
  rotY?: number   // Y-axis rotation in radians (for side-facing buildings)
}

// ── Authentic Portofino colour palette (from reference photos) ────────────────
// Deep orange-red, yellow-ochre, lemon yellow, salmon, burnt sienna, cream
const BUILDINGS: BuildingCfg[] = [

  // ════ FRONT WATERFRONT ROW — the iconic coloured facade ════════════════════
  { x: -14, z: -21, w: 3.8, h: 10, d: 3.4, color: '#CC4E18', floors: 3, cols: 2 },  // deep orange
  { x: -10, z: -22, w: 4.4, h: 15, d: 3.4, color: '#D4A828', floors: 4, cols: 3 },  // yellow-ochre tall
  { x:  -5, z: -22, w: 3.6, h: 12, d: 3.4, color: '#E07848', floors: 3, cols: 2 },  // warm salmon
  { x:  -1, z: -23, w: 5.0, h: 17, d: 3.4, color: '#C84020', floors: 5, cols: 3 },  // vivid burnt red
  { x:   4, z: -23, w: 4.2, h: 14, d: 3.4, color: '#E8C840', floors: 4, cols: 3 },  // bright lemon
  { x:   9, z: -22, w: 4.4, h: 15, d: 3.4, color: '#D46030', floors: 4, cols: 3 },  // vivid orange
  { x:  14, z: -21, w: 3.6, h: 11, d: 3.4, color: '#DCA828', floors: 3, cols: 2 },  // golden ochre
  { x:  18, z: -20, w: 4.0, h: 10, d: 3.4, color: '#E07040', floors: 3, cols: 3 },  // salmon-orange
  { x:  22, z: -19, w: 3.8, h:  9, d: 3.4, color: '#F0E0A0', floors: 3, cols: 2 },  // pale cream

  // ════ LEFT FLANK — buildings wrapping the left headland ════════════════════
  // rotY = -π/6 so front faces angle toward harbour centre
  { x: -18, z: -19, w: 3.8, h: 11, d: 3.2, color: '#B03A18', floors: 3, cols: 2, rotY: -0.52 },
  { x: -22, z: -16, w: 4.2, h: 10, d: 3.2, color: '#D4A828', floors: 3, cols: 3, rotY: -0.62 },
  { x: -25, z: -12, w: 3.6, h:  9, d: 3.2, color: '#E07848', floors: 3, cols: 2, rotY: -0.72 },

  // ════ RIGHT FLANK — buildings wrapping right headland ══════════════════════
  // rotY = +π/6 so front faces angle toward harbour centre
  { x:  26, z: -16, w: 4.0, h: 11, d: 3.2, color: '#CC4E18', floors: 3, cols: 2, rotY:  0.55 },
  { x:  29, z: -12, w: 3.8, h: 10, d: 3.2, color: '#E8C840', floors: 3, cols: 3, rotY:  0.65 },
  { x:  32, z:  -8, w: 3.4, h:  9, d: 3.2, color: '#E07040', floors: 3, cols: 2, rotY:  0.72 },

  // ════ SECOND ROW — hillside, elevated 2–3m above waterfront ════════════════
  { x: -12, z: -27, w: 3.2, h:  8, d: 3.2, color: '#F0E4C0', rowY: 2.0, floors: 2, cols: 2 },
  { x:  -8, z: -28, w: 3.8, h: 11, d: 3.2, color: '#CC4E18', rowY: 2.5, floors: 3, cols: 2 },
  { x:  -4, z: -29, w: 3.4, h: 10, d: 3.2, color: '#D4A828', rowY: 3.0, floors: 3, cols: 2 },
  { x:   0, z: -29, w: 4.4, h: 12, d: 3.2, color: '#B03A18', rowY: 3.0, floors: 3, cols: 3 },
  { x:   5, z: -29, w: 3.4, h: 10, d: 3.2, color: '#E07848', rowY: 3.0, floors: 3, cols: 2 },
  { x:   9, z: -28, w: 3.8, h: 11, d: 3.2, color: '#E8C840', rowY: 2.5, floors: 3, cols: 2 },
  { x:  13, z: -27, w: 3.2, h:  8, d: 3.2, color: '#D4A828', rowY: 2.0, floors: 2, cols: 2 },

  // ════ THIRD ROW — upper hillside, lighter/sun-bleached tones ═══════════════
  { x: -10, z: -33, w: 3.2, h:  8, d: 3.0, color: '#ECD49A', rowY: 5.5, floors: 2, cols: 2 },
  { x:  -6, z: -34, w: 3.4, h:  9, d: 3.0, color: '#D4886A', rowY: 6.0, floors: 2, cols: 2 },
  { x:  -2, z: -34, w: 4.2, h: 10, d: 3.0, color: '#F0DCA8', rowY: 6.0, floors: 3, cols: 3 },
  { x:   3, z: -34, w: 3.8, h:  9, d: 3.0, color: '#D49858', rowY: 6.0, floors: 3, cols: 2 },
  { x:   7, z: -33, w: 3.2, h:  8, d: 3.0, color: '#ECC880', rowY: 5.5, floors: 2, cols: 2 },
  { x:  11, z: -32, w: 3.0, h:  7, d: 3.0, color: '#DCC490', rowY: 5.0, floors: 2, cols: 2 },
]

function HarborBuildings() {
  // One texture per unique color+floors+cols combination
  const textures = useMemo(() => {
    const cache = new Map<string, THREE.CanvasTexture>()
    return BUILDINGS.map(b => {
      const key = `${b.color}-${b.floors ?? 4}-${b.cols ?? 3}`
      if (!cache.has(key)) cache.set(key, makeWallTexture(b.color, b.floors ?? 4, b.cols ?? 3))
      return cache.get(key)!
    })
  }, [])

  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, (b.rowY ?? 0) + b.h / 2 - 1.0, b.z]}
          rotation={[0, b.rotY ?? 0, 0]}
          castShadow receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            map={textures[i]}
            roughness={0.78}
            metalness={0.0}
          />
        </mesh>
      ))}

      {/* Terracotta rooftops — all rows */}
      {BUILDINGS.map((b, i) => (
        <mesh
          key={`roof-${i}`}
          position={[b.x, (b.rowY ?? 0) + b.h - 1.0 + 0.50, b.z]}
          rotation={[0, b.rotY ?? 0, 0]}
          castShadow
        >
          <boxGeometry args={[b.w + 0.12, 0.32, b.d + 0.12]} />
          <meshStandardMaterial color="#8A3618" roughness={0.88} />
        </mesh>
      ))}
    </group>
  )
}

// ── Hill terrain ──────────────────────────────────────────────────────────────

function HillTerrain() {
  return (
    <group>
      <mesh position={[0, 4, -35]}>
        <sphereGeometry args={[22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3A6B40" side={THREE.BackSide} roughness={0.9} />
      </mesh>
      <mesh position={[-22, 3, -22]}>
        <sphereGeometry args={[12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2D5A35" side={THREE.BackSide} roughness={0.9} />
      </mesh>
      <mesh position={[24, 3, -20]}>
        <sphereGeometry args={[14, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#365E3C" side={THREE.BackSide} roughness={0.9} />
      </mesh>

      {/* Pine trees */}
      {([
        [-18, -28], [-16, -30], [-14, -31],
        [ 18, -26], [ 21, -28], [ 23, -25],
        [  0, -32], [  3, -33], [ -4, -32],
      ] as [number, number][]).map(([x, z], i) => (
        <group key={i} position={[x, 3.5 + (i % 3) * 0.8, z]}>
          <mesh position={[0, -1.5, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.8, 6]} />
            <meshStandardMaterial color="#5C3D1E" roughness={0.95} />
          </mesh>
          <mesh castShadow>
            <coneGeometry args={[0.9, 2.4, 6]} />
            <meshStandardMaterial color="#2A5C32" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Church / campanile ────────────────────────────────────────────────────────

function Church() {
  return (
    <group position={[12, 6, -35]}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 5, 3.5]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.75} />
      </mesh>
      <mesh position={[0, 4.5, 1.8]} castShadow>
        <coneGeometry args={[2.5, 1.8, 4]} />
        <meshStandardMaterial color="#E8E0D0" roughness={0.85} />
      </mesh>
      <mesh position={[2.5, 5, 0]} castShadow>
        <boxGeometry args={[1.2, 10, 1.2]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.75} />
      </mesh>
      <mesh position={[2.5, 10.5, 0]} castShadow>
        <coneGeometry args={[1.0, 1.8, 4]} />
        <meshStandardMaterial color="#C84B31" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.8, 0]}>
        <sphereGeometry args={[1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#9E9E6E" roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  )
}

// ── Castello Brown (castle silhouette on left headland) ───────────────────────

function Castello() {
  return (
    <group position={[-22, 9, -28]}>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 6, 4]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
      {/* Battlements — small boxes on top */}
      {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 5.5, 1.8]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.4]} />
          <meshStandardMaterial color="#8B7355" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[2.5, 4, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.0, 8, 8]} />
        <meshStandardMaterial color="#78634A" roughness={0.9} />
      </mesh>
      <mesh position={[2.5, 8.5, 0]} castShadow>
        <coneGeometry args={[0.9, 1.5, 8]} />
        <meshStandardMaterial color="#5A4A30" roughness={0.85} />
      </mesh>
    </group>
  )
}

// ── Harbor piazza — the sandy stone square at the back of the harbour ─────────

function HarborPiazza() {
  return (
    <group>
      {/* Main piazza floor — warm sandy stone */}
      <mesh position={[0, -0.88, -16.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 9]} />
        <meshStandardMaterial color="#C4B080" roughness={0.96} />
      </mesh>
      {/* Stone paving — slightly lighter central band */}
      <mesh position={[0, -0.87, -16.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 6]} />
        <meshStandardMaterial color="#CEC090" roughness={0.95} />
      </mesh>
      {/* Café awning 1 — green (left) */}
      <mesh position={[-8, 0.20, -19.5]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[5.5, 0.12, 2.2]} />
        <meshStandardMaterial color="#2A6030" roughness={0.85} />
      </mesh>
      {/* Café awning 2 — green (right) */}
      <mesh position={[6, 0.20, -19.5]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[5.0, 0.12, 2.2]} />
        <meshStandardMaterial color="#246428" roughness={0.85} />
      </mesh>
      {/* White parasols — scattered around piazza */}
      {([ [-4, -15.5], [0, -14.5], [4, -15.0], [-7, -14.0], [7, -14.5] ] as [number,number][])
        .map(([px, pz], i) => (
          <group key={i} position={[px, 0.0, pz]}>
            {/* Pole */}
            <mesh position={[0, 0.55, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1.1, 5]} />
              <meshStandardMaterial color="#B0A890" roughness={0.8} />
            </mesh>
            {/* Canopy */}
            <mesh position={[0, 1.15, 0]}>
              <coneGeometry args={[0.75, 0.28, 8]} />
              <meshStandardMaterial color="#F8F4EC" roughness={0.85} />
            </mesh>
          </group>
        ))}
    </group>
  )
}

// ── Harbor quay — stone promenade + seawall that anchors buildings to water ───
// This fixes the "buildings floating on sea" issue by providing a solid ground.

function HarborQuay() {
  const quayY = -0.90   // matches water surface (y = -0.85) + tiny overlap

  return (
    <group>
      {/* Stone promenade floor — extends to z=-7 (past seawall) so it covers
          the water's shore-fade transition zone (-11 to -8) */}
      <mesh position={[0, quayY, -17.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[56, 21]} />
        <meshStandardMaterial color="#A0917E" roughness={0.97} metalness={0.0} />
      </mesh>

      {/* Seawall — low stone retaining wall sitting right at the water edge */}
      <mesh position={[0, quayY + 0.28, -9.5]} castShadow receiveShadow>
        <boxGeometry args={[56, 0.55, 0.72]} />
        <meshStandardMaterial color="#8C7B6A" roughness={0.95} />
      </mesh>
      {/* Seawall cap / coping stone */}
      <mesh position={[0, quayY + 0.60, -9.5]} castShadow>
        <boxGeometry args={[56.2, 0.13, 0.90]} />
        <meshStandardMaterial color="#9E8E7C" roughness={0.90} />
      </mesh>

      {/* Rear embankment — rises against base of buildings */}
      <mesh position={[0, quayY + 0.18, -27.0]} castShadow receiveShadow>
        <boxGeometry args={[56, 0.42, 0.60]} />
        <meshStandardMaterial color="#8B7A6A" roughness={0.95} />
      </mesh>

      {/* Mooring posts / bollards along seawall */}
      {([-18, -10, -2, 6, 14, 20] as number[]).map((x, i) => (
        <mesh key={i} position={[x, quayY + 0.72, -9.5]} castShadow>
          <cylinderGeometry args={[0.14, 0.18, 0.30, 8]} />
          <meshStandardMaterial color="#6A5A4C" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ── Pier / dock ───────────────────────────────────────────────────────────────

function Pier() {
  return (
    <group position={[-11, -0.6, -6]}>
      {/* Pier deck */}
      <mesh>
        <boxGeometry args={[3.5, 0.25, 14]} />
        <meshLambertMaterial color="#8B6E4E" />
      </mesh>
      {/* Bollards */}
      {[-5, -1, 3].map((z, i) => (
        <mesh key={i} position={[1.5, 0.4, z]}>
          <cylinderGeometry args={[0.18, 0.22, 0.9, 6]} />
          <meshLambertMaterial color="#555550" />
        </mesh>
      ))}
      {/* Small moored boats */}
      <mesh position={[3, -0.1, -3]}>
        <boxGeometry args={[1.2, 0.4, 3.5]} />
        <meshLambertMaterial color="#E8E0D0" />
      </mesh>
      <mesh position={[3, -0.1, 2]}>
        <boxGeometry args={[1.0, 0.35, 2.8]} />
        <meshLambertMaterial color="#C84B31" />
      </mesh>
    </group>
  )
}

// ── Sailboat with iPhone sail ─────────────────────────────────────────────────

// Boat path through the harbor (right entrance → center-left)
const HARBOR_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(18,  0.0, -6),
  new THREE.Vector3(12,  0.0, -3),
  new THREE.Vector3( 6,  0.0,  0),
  new THREE.Vector3( 0,  0.0,  2),
  new THREE.Vector3(-5,  0.0,  4),
  new THREE.Vector3(-8,  0.0,  5),
])

function SailboatWithPhone() {
  const boatRef  = useRef<THREE.Group>(null)
  const { node } = useNarrative()

  const targetProgress = useRef(0)
  const smoothProgress = useRef(0)

  useEffect(() => {
    targetProgress.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(({ clock }) => {
    if (!boatRef.current) return
    const t = clock.getElapsedTime()

    // Smooth lerp toward target position
    smoothProgress.current += (targetProgress.current - smoothProgress.current) * 0.010

    const p   = Math.min(Math.max(smoothProgress.current, 0), 0.9999)
    const pos = HARBOR_PATH.getPoint(p)
    const tan = HARBOR_PATH.getTangent(p)

    boatRef.current.position.copy(pos)
    boatRef.current.position.y = 0

    // Face direction of travel
    boatRef.current.rotation.y = Math.atan2(tan.x, tan.z)

    // Gentle wave rocking
    boatRef.current.rotation.x = Math.sin(t * 0.38) * 0.025
    boatRef.current.rotation.z = Math.sin(t * 0.29 + 1.3) * 0.018

  })

  // ── Shared material constants ──────────────────────────────────────────────
  // Gel coat: high-gloss fibreglass (real boats roughness ~0.06–0.12)
  const GEL  = { color: '#F0EEE8', metalness: 0.06, roughness: 0.09 } as const
  // Anti-fouling paint below waterline (navy blue, matte)
  const ANTI = { color: '#1A2B72', roughness: 0.94 } as const
  // Anodised aluminium (mast, boom, stanchions, cleats)
  const ALU  = { color: '#B8BECA', metalness: 0.92, roughness: 0.13 } as const
  // Varnished teak (cockpit sole, trim)
  const TEAK = { color: '#7A4C26', roughness: 0.60, metalness: 0.02 } as const
  // Tinted safety glass (windows, companionway)
  const GLASS = { color: '#3A6898', emissive: '#3A6898' as string, emissiveIntensity: 0.14,
                  metalness: 0.28, roughness: 0.04, transparent: true, opacity: 0.68 } as const

  const HX = 1.85   // hull X offset from centreline

  return (
    <group ref={boatRef} position={[18, 0, -6]}>

      {/* ════════════════════════════════════════════════════════════════════
          HULLS — port (x = -HX) and starboard (x = +HX)
          Each hull: tapered bow sections + rounded bilge keel + anti-fouling
                     + gold boot-stripe + deck + teak inlay + porthole windows
                     + navigation lights + stanchion posts + cleats
         ════════════════════════════════════════════════════════════════════ */}

      {([
        { x: -HX, side: 1, navCol: '#FF2020', navEmit: '#FF0000' },  // port  — red nav light
        { x:  HX, side:-1, navCol: '#20FF44', navEmit: '#00FF33' },  // stbd  — green nav light
      ] as const).map(({ x, side, navCol, navEmit }, hi) => (
        <group key={hi} position={[x, 0, 0]}>

          {/* ── Main mid-ship body (white gel coat) ── */}
          <mesh position={[0, -0.20, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.96, 0.72, 7.80]} />
            <meshStandardMaterial {...GEL} />
          </mesh>

          {/* ── Bow taper 1 — starts the hull narrowing ── */}
          <mesh position={[0, -0.22, -4.30]}>
            <boxGeometry args={[0.76, 0.68, 1.50]} />
            <meshStandardMaterial {...GEL} />
          </mesh>
          {/* ── Bow taper 2 ── */}
          <mesh position={[0, -0.24, -5.10]}>
            <boxGeometry args={[0.46, 0.62, 1.10]} />
            <meshStandardMaterial {...GEL} />
          </mesh>
          {/* ── Bow knife edge ── */}
          <mesh position={[0, -0.28, -5.72]} rotation={[0.30, 0, 0]}>
            <boxGeometry args={[0.16, 0.52, 0.52]} />
            <meshStandardMaterial {...GEL} />
          </mesh>

          {/* ── Stern taper ── */}
          <mesh position={[0, -0.22, 4.40]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.88, 0.66, 0.90]} />
            <meshStandardMaterial {...GEL} />
          </mesh>

          {/* ── Anti-fouling paint — below waterline ── */}
          <mesh position={[0, -0.54, 0]}>
            <boxGeometry args={[0.98, 0.32, 7.84]} />
            <meshStandardMaterial {...ANTI} />
          </mesh>
          <mesh position={[0, -0.54, -4.30]}>
            <boxGeometry args={[0.78, 0.30, 1.52]} />
            <meshStandardMaterial {...ANTI} />
          </mesh>
          <mesh position={[0, -0.54, -5.10]}>
            <boxGeometry args={[0.48, 0.28, 1.12]} />
            <meshStandardMaterial {...ANTI} />
          </mesh>

          {/* ── Gold boot stripe (waterline accent) ── */}
          <mesh position={[0, -0.37, 0]}>
            <boxGeometry args={[0.99, 0.055, 7.86]} />
            <meshStandardMaterial color="#C8A84A" metalness={0.32} roughness={0.38} />
          </mesh>

          {/* ── Rounded bilge keel — gives hull depth & hydrodynamic look ── */}
          <mesh position={[0, -0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 9.0, 10]} />
            <meshStandardMaterial color="#141E52" roughness={0.96} />
          </mesh>

          {/* ── Deck surface ── */}
          <mesh position={[0, 0.17, 0]} receiveShadow>
            <boxGeometry args={[0.88, 0.07, 7.60]} />
            <meshStandardMaterial color="#EDEAE0" roughness={0.70} />
          </mesh>

          {/* ── Teak deck inlay ── */}
          <mesh position={[0, 0.22, 0.4]}>
            <boxGeometry args={[0.62, 0.035, 4.60]} />
            <meshStandardMaterial {...TEAK} />
          </mesh>

          {/* ── Porthole windows (2 per hull, outboard face) ── */}
          {[-0.4, 1.0].map((wz, wi) => (
            <mesh key={wi} position={[side * 0.47, -0.10, wz]}>
              <planeGeometry args={[0.30, 0.20]} />
              <meshStandardMaterial {...GLASS} />
            </mesh>
          ))}

          {/* ── Navigation light (port=red, stbd=green) ── */}
          <mesh position={[side * 0.49, 0.24, -4.10]}>
            <boxGeometry args={[0.07, 0.10, 0.10]} />
            <meshStandardMaterial color={navCol} emissive={navEmit} emissiveIntensity={1.0} />
          </mesh>

          {/* ── Stanchion posts (5 per hull) ── */}
          {[-3.2, -1.6, 0.0, 1.6, 3.0].map((sz, si) => (
            <mesh key={si} position={[side * 0.45, 0.46, sz]} castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.58, 6]} />
              <meshStandardMaterial {...ALU} />
            </mesh>
          ))}

          {/* ── Cleats ── */}
          <mesh position={[0, 0.23, -3.60]}>
            <boxGeometry args={[0.20, 0.07, 0.28]} />
            <meshStandardMaterial {...ALU} />
          </mesh>
          <mesh position={[0, 0.23, 3.30]}>
            <boxGeometry args={[0.20, 0.07, 0.28]} />
            <meshStandardMaterial {...ALU} />
          </mesh>

        </group>
      ))}

      {/* ════════════════════════════════════════════════════════════════════
          LIFELINES — stainless wire along stanchion tops, port and starboard
         ════════════════════════════════════════════════════════════════════ */}
      <Lifelines hx={HX} />

      {/* ════════════════════════════════════════════════════════════════════
          CROSSBEAMS + TRAMPOLINE
         ════════════════════════════════════════════════════════════════════ */}

      {/* Forward beam */}
      <mesh position={[0, 0.16, -2.80]} castShadow>
        <boxGeometry args={[4.10, 0.22, 0.48]} />
        <meshStandardMaterial color="#E4E0D6" roughness={0.52} metalness={0.05} />
      </mesh>
      {/* Aft beam */}
      <mesh position={[0, 0.16, 2.80]} castShadow>
        <boxGeometry args={[4.10, 0.22, 0.48]} />
        <meshStandardMaterial color="#E4E0D6" roughness={0.52} metalness={0.05} />
      </mesh>
      {/* Beam lower flanges (structural detail) */}
      {[-2.80, 2.80].map((bz, bi) => (
        <mesh key={bi} position={[0, 0.06, bz]}>
          <boxGeometry args={[4.14, 0.08, 0.52]} />
          <meshStandardMaterial {...ALU} />
        </mesh>
      ))}

      {/* Trampoline netting */}
      <mesh position={[0, 0.09, -0.08]}>
        <boxGeometry args={[2.38, 0.045, 5.56]} />
        <meshStandardMaterial color="#C0B496" roughness={0.97} transparent opacity={0.86} />
      </mesh>
      {/* Trampoline edging rope */}
      {([-1.19, 1.19] as number[]).map((tx, ti) => (
        <mesh key={ti} position={[tx, 0.11, -0.08]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 5.56, 7]} />
          <meshStandardMaterial color="#8A7A5C" roughness={0.80} />
        </mesh>
      ))}

      {/* ════════════════════════════════════════════════════════════════════
          CABIN / SALOON
         ════════════════════════════════════════════════════════════════════ */}

      {/* Main saloon body */}
      <mesh position={[0, 0.70, 1.10]} castShadow receiveShadow>
        <boxGeometry args={[3.10, 0.86, 3.10]} />
        <meshStandardMaterial {...GEL} />
      </mesh>
      {/* Cabin roof — slightly wider with chamfered edge feel */}
      <mesh position={[0, 1.16, 1.10]} castShadow>
        <boxGeometry args={[3.16, 0.16, 3.16]} />
        <meshStandardMaterial color="#E6E2D8" roughness={0.60} metalness={0.03} />
      </mesh>
      {/* Cabin roof crown (subtle arch via slightly taller centre strip) */}
      <mesh position={[0, 1.25, 1.10]}>
        <boxGeometry args={[2.40, 0.09, 3.12]} />
        <meshStandardMaterial color="#E0DCD0" roughness={0.62} />
      </mesh>

      {/* Solar panel on roof */}
      <mesh position={[0, 1.30, 0.50]}>
        <boxGeometry args={[2.10, 0.038, 1.50]} />
        <meshStandardMaterial color="#18243A" metalness={0.38} roughness={0.22} />
      </mesh>
      {/* Solar cell grid lines (3 horizontal) */}
      {[-0.38, 0, 0.38].map((sz, si) => (
        <mesh key={si} position={[0, 1.322, 0.50 + sz * 0.9]}>
          <boxGeometry args={[2.12, 0.008, 0.012]} />
          <meshStandardMaterial color="#243352" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}

      {/* Cabin windows — port side (4 windows with tinted glass) */}
      {[-0.70, 0.10, 0.90, 1.70].map((wz, i) => (
        <mesh key={`cwp-${i}`} position={[-1.56, 0.72, wz]}>
          <planeGeometry args={[0.50, 0.32]} />
          <meshStandardMaterial {...GLASS} />
        </mesh>
      ))}
      {/* Cabin windows — starboard side */}
      {[-0.70, 0.10, 0.90, 1.70].map((wz, i) => (
        <mesh key={`cws-${i}`} position={[1.56, 0.72, wz]}>
          <planeGeometry args={[0.50, 0.32]} />
          <meshStandardMaterial {...GLASS} />
        </mesh>
      ))}
      {/* Companionway hatch (front cabin entry) */}
      <mesh position={[0, 0.70, -0.42]}>
        <boxGeometry args={[0.76, 0.86, 0.07]} />
        <meshStandardMaterial {...GLASS} opacity={0.55} />
      </mesh>
      {/* Hatch frame */}
      <mesh position={[0, 0.70, -0.44]}>
        <boxGeometry args={[0.82, 0.92, 0.05]} />
        <meshStandardMaterial {...ALU} />
      </mesh>

      {/* ── Cockpit area (aft of cabin) ── */}
      {/* Teak cockpit sole */}
      <mesh position={[0, 0.20, 3.45]}>
        <boxGeometry args={[2.70, 0.06, 1.70]} />
        <meshStandardMaterial {...TEAK} />
      </mesh>
      {/* Cockpit coaming (raised sides) */}
      {([-1.35, 1.35] as number[]).map((cx, ci) => (
        <mesh key={ci} position={[cx, 0.42, 3.45]}>
          <boxGeometry args={[0.08, 0.44, 1.70]} />
          <meshStandardMaterial color="#E8E4DA" roughness={0.60} />
        </mesh>
      ))}
      {/* Cockpit aft seat */}
      <mesh position={[0, 0.42, 4.28]}>
        <boxGeometry args={[2.70, 0.09, 0.42]} />
        <meshStandardMaterial color="#DEDAD0" roughness={0.65} />
      </mesh>

      {/* ── Helm wheel ── */}
      <mesh position={[0, 0.86, 3.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.29, 0.028, 8, 20]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Wheel hub */}
      <mesh position={[0, 0.86, 3.72]}>
        <cylinderGeometry args={[0.055, 0.055, 0.08, 8]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Wheel spokes (4) */}
      {[0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4].map((a, i) => (
        <mesh key={`spk-${i}`} position={[0, 0.86, 3.72]} rotation={[Math.PI / 2, a, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.58, 5]} />
          <meshStandardMaterial {...ALU} />
        </mesh>
      ))}
      {/* Binnacle (pedestal) */}
      <mesh position={[0, 0.52, 3.72]}>
        <cylinderGeometry args={[0.075, 0.095, 0.68, 8]} />
        <meshStandardMaterial {...ALU} />
      </mesh>

      {/* ── Winch (on port cabin side) ── */}
      <mesh position={[-1.30, 1.20, -0.40]}>
        <cylinderGeometry args={[0.10, 0.12, 0.16, 10]} />
        <meshStandardMaterial color="#C8A84A" metalness={0.55} roughness={0.30} />
      </mesh>

      {/* ════════════════════════════════════════════════════════════════════
          MAST — anodised aluminium, stepped on cabin centre
         ════════════════════════════════════════════════════════════════════ */}

      {/* Mast step collar at base */}
      <mesh position={[0, 1.30, 0.60]}>
        <cylinderGeometry args={[0.13, 0.13, 0.18, 8]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Mast tube */}
      <mesh position={[0, 4.60, 0.60]} castShadow>
        <cylinderGeometry args={[0.062, 0.092, 9.60, 9]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Mast top cap */}
      <mesh position={[0, 9.48, 0.60]}>
        <sphereGeometry args={[0.085, 8, 6]} />
        <meshStandardMaterial {...ALU} />
      </mesh>

      {/* ── Spreaders (lower) ── */}
      <mesh position={[0, 6.20, 0.60]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.024, 0.024, 3.40, 6]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Spreader tip brackets */}
      {([-1.70, 1.70] as number[]).map((sx, si) => (
        <mesh key={si} position={[sx, 6.20, 0.60]}>
          <sphereGeometry args={[0.038, 6, 5]} />
          <meshStandardMaterial {...ALU} />
        </mesh>
      ))}

      {/* ── Boom — aluminium, kicker attachment ── */}
      <mesh position={[0, 1.55, -0.30]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.040, 0.052, 6.10, 8]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Boom end cap */}
      <mesh position={[3.05, 1.55, -0.30]}>
        <sphereGeometry args={[0.048, 6, 5]} />
        <meshStandardMaterial {...ALU} />
      </mesh>
      {/* Vang (kicker) — diagonal support from mast to boom */}
      <VangLine />

      {/* ── Rigging ── */}
      <RiggingLines />

      {/* ── Sails ── */}
      <JibSail />
      <MainSail />

      {/* ── Wake foam trails (one per hull) ── */}
      <WakeTrail />
    </group>
  )
}

// ── Lifelines — stainless safety wire along stanchion tops ───────────────────

function Lifelines({ hx }: { hx: number }) {
  const LINES = useMemo(() => {
    const mk = (a: THREE.Vector3, b: THREE.Vector3) =>
      new THREE.BufferGeometry().setFromPoints([a, b])
    const stanchZ = [-3.2, -1.6, 0.0, 1.6, 3.0]
    const lines = []
    for (const sx of [-hx * 0.98, hx * 0.98]) {
      for (let i = 0; i < stanchZ.length - 1; i++) {
        lines.push(mk(
          new THREE.Vector3(sx, 0.72, stanchZ[i]),
          new THREE.Vector3(sx, 0.72, stanchZ[i + 1]),
        ))
      }
    }
    return lines
  }, [hx])

  return (
    <>
      {LINES.map((geo, i) => (
        <line key={i}>
          <bufferGeometry {...geo} />
          <lineBasicMaterial color="#D0D4DC" transparent opacity={0.65} />
        </line>
      ))}
    </>
  )
}

// ── Vang (kicker) — diagonal line from boom to mast base ─────────────────────

function VangLine() {
  const geo = useMemo(() =>
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.55, -0.30),   // boom jaw
      new THREE.Vector3(0, 1.42, 0.60),    // mast base
    ]), [])
  return (
    <line>
      <bufferGeometry {...geo} />
      <lineBasicMaterial color="#B8BECA" transparent opacity={0.70} />
    </line>
  )
}

// ── Rigging lines ─────────────────────────────────────────────────────────────

function RiggingLines() {
  const LINES = useMemo(() => {
    const mk = (a: THREE.Vector3, b: THREE.Vector3) =>
      new THREE.BufferGeometry().setFromPoints([a, b])
    return [
      // Forestay: mast top → bow
      mk(new THREE.Vector3(0, 9.48, 0.60), new THREE.Vector3(0, 0.18, -5.20)),
      // Lower shroud port: spreader tip → port chain plate
      mk(new THREE.Vector3(-1.70, 6.20, 0.60), new THREE.Vector3(-1.85, 0.18, 0.60)),
      // Lower shroud stbd
      mk(new THREE.Vector3( 1.70, 6.20, 0.60), new THREE.Vector3( 1.85, 0.18, 0.60)),
      // Cap shroud port: mast top → spreader tip → (implied, draw top segment)
      mk(new THREE.Vector3(0, 9.48, 0.60), new THREE.Vector3(-1.70, 6.20, 0.60)),
      // Cap shroud stbd
      mk(new THREE.Vector3(0, 9.48, 0.60), new THREE.Vector3( 1.70, 6.20, 0.60)),
      // Backstay: mast top → aft centreline
      mk(new THREE.Vector3(0, 9.48, 0.60), new THREE.Vector3(0, 0.20, 4.60)),
      // Port running backstay → port stern hull
      mk(new THREE.Vector3(0, 9.48, 0.60), new THREE.Vector3(-1.85, 0.18, 4.20)),
      // Stbd running backstay
      mk(new THREE.Vector3(0, 9.48, 0.60), new THREE.Vector3( 1.85, 0.18, 4.20)),
      // Topping lift: mast top → boom end
      mk(new THREE.Vector3(0, 9.48, 0.60), new THREE.Vector3(3.05, 1.55, -0.30)),
    ]
  }, [])

  return (
    <>
      {LINES.map((geo, i) => (
        <line key={i}>
          <bufferGeometry {...geo} />
          <lineBasicMaterial color="#C8CCDA" transparent opacity={0.60} />
        </line>
      ))}
    </>
  )
}

// ── Jib sail ──────────────────────────────────────────────────────────────────

function JibSail() {
  const geo = useMemo(() => {
    const v = new Float32Array([
      0,   0.20, -5.10,   // clew — bow forestay attachment
      0,   9.48,  0.60,   // head — mast top
      0,   1.60,  0.60,   // tack — mast base
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.setIndex([0, 1, 2])
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color="#F4EFE2"
        side={THREE.DoubleSide}
        roughness={0.72}
        metalness={0.0}
        transparent
        opacity={0.90}
      />
    </mesh>
  )
}

// ── Main sail (Bermuda rig — updated for catamaran mast position) ─────────────
//   Head:  mast top  (0, 9.4, 0.6)
//   Tack:  boom jaw  (0, 1.25, 0.6)
//   Clew:  boom end  (0, 1.25, 3.6)  ← stern side

function MainSail() {
  const geo = useMemo(() => {
    const v = new Float32Array([
       0.00, 9.48,  0.60,   // head — mast top
      -0.16, 5.20,  2.20,   // mid-luff with natural billow
       0.00, 1.60,  0.60,   // tack — boom jaw
       0.00, 1.55,  3.75,   // clew — boom end
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.setIndex([0, 2, 3,  0, 3, 1,  0, 1, 2])
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color="#EDE8DA"
        side={THREE.DoubleSide}
        roughness={0.68}
        metalness={0.0}
        transparent
        opacity={0.93}
      />
    </mesh>
  )
}

// ── Sun-synced directional light ──────────────────────────────────────────────

function SceneLighting() {
  const dirRef  = useRef<THREE.DirectionalLight>(null)
  const { node } = useNarrative()
  const progressRef = useRef(0)

  useEffect(() => {
    progressRef.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(() => {
    if (!dirRef.current) return
    const p = progressRef.current
    // Sun moves from high-noon position → golden-hour (lower, warmer)
    dirRef.current.position.set(
      8 - p * 10,
      14 - p * 8,
      6,
    )
    // Warm golden color shift
    const r = 1.0
    const g = 1.0 - p * 0.18
    const b = 0.9 - p * 0.35
    dirRef.current.color.setRGB(r, g, b)
    dirRef.current.intensity = 1.4 + p * 0.8
  })

  return (
    <>
      {/* Warmer ambient — Mediterranean afternoon sun bounce */}
      <ambientLight intensity={0.62} color="#D4CEB8" />
      <directionalLight ref={dirRef} position={[8, 14, 6]} intensity={1.6} color="#FFF8EE" castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {/* Sky fill — cerulean from above, warm earth bounce from below */}
      <hemisphereLight args={['#7EC8E3', '#5A7A40', 0.40]} />
    </>
  )
}

// ── Sky with narrative-reactive sun ──────────────────────────────────────────

function SceneSky() {
  const skyRef      = useRef<THREE.Mesh>(null)
  const { node }    = useNarrative()
  const progressRef = useRef(0)

  useEffect(() => {
    progressRef.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  // Mediterranean afternoon — clear cerulean sky with warm sun at ~45° elevation
  return (
    <Sky
      distance={4500}
      sunPosition={[1.0, 0.62, -0.8]}
      inclination={0.50}
      azimuth={0.20}
      turbidity={3.5}
      rayleigh={2.2}
      mieCoefficient={0.004}
      mieDirectionalG={0.86}
    />
  )
}

// ── Scene fog ─────────────────────────────────────────────────────────────────

function SceneFog() {
  // Warm Ligurian atmospheric haze — slightly greenish-grey, not cool blue
  return <fog attach="fog" args={['#C2CEB8', 30, 90]} />
}

// ── Inner scene (used inside Canvas) ─────────────────────────────────────────

function PortofinoInner() {
  return (
    <>
      <SceneFog />
      <SceneLighting />
      <SceneSky />
      <WaterSurface />
      <HarborPiazza />     {/* sandy stone piazza + café awnings */}
      <HarborQuay />       {/* stone promenade + seawall */}
      <HarborBuildings />
      <HillTerrain />
      <Church />
      <Castello />
      <Pier />
      <SailboatWithPhone />
    </>
  )
}

// ── Dynamic Canvas export (no SSR) ───────────────────────────────────────────

export const PortofinoScene = dynamic(
  () =>
    import('@react-three/fiber').then(({ Canvas }) => {
      function PortofinoCanvas() {
        return (
          <Canvas
            camera={{ position: [-1, 6.5, 24], fov: 68, near: 0.1, far: 220 }}
            style={{ position: 'fixed', inset: 0, zIndex: 0 }}
            gl={{ antialias: true, alpha: false }}
            shadows
            dpr={[1, 2]}
          >
            <PortofinoInner />
          </Canvas>
        )
      }
      return { default: PortofinoCanvas }
    }),
  { ssr: false },
)
