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

// ── Canvas building texture — stucco, windows, mullions, shutters ─────────────

function makeWallTexture(baseHex: string, floors = 4, cols = 3): THREE.CanvasTexture {
  const W = 256, H = 512
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!

  // Base plaster
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, W, H)

  // Weathering: lighter top, darker base
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0.0, 'rgba(255,255,255,0.07)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.0)')
  grad.addColorStop(1.0, 'rgba(0,0,0,0.22)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Horizontal stucco scoring
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'
  ctx.lineWidth = 1
  for (let y = 18; y < H; y += 18) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  // Windows with frames, mullions, shutters
  const cellW = W / cols,  cellH = H / floors
  const winW  = cellW * 0.36, winH = cellH * 0.38
  const shuW  = winW  * 0.38

  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cellW + (cellW - winW) / 2
      const wy = r * cellH + cellH * 0.22

      // Sill ledge
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(wx - 3, wy + winH, winW + 6, 4)

      // Dark wood frame
      ctx.fillStyle = '#3C2810'
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4)

      // Glass — sky-blue tint
      ctx.fillStyle = '#6B9EC0'
      ctx.fillRect(wx, wy, winW, winH)

      // Inner glass shadow
      const gShadow = ctx.createLinearGradient(wx, wy, wx + winW, wy + winH)
      gShadow.addColorStop(0,   'rgba(0,0,0,0.30)')
      gShadow.addColorStop(0.5, 'rgba(0,0,0,0.0)')
      gShadow.addColorStop(1,   'rgba(0,0,0,0.15)')
      ctx.fillStyle = gShadow
      ctx.fillRect(wx, wy, winW, winH)

      // Mullions
      ctx.fillStyle = '#3C2810'
      ctx.fillRect(wx + winW / 2 - 1, wy, 2, winH)
      ctx.fillRect(wx, wy + winH / 2 - 1, winW, 2)

      // Dark-green shutters (partially open)
      ctx.fillStyle = '#1F4A2C'
      ctx.fillRect(wx - shuW - 2, wy, shuW, winH)
      ctx.fillRect(wx + winW + 2,  wy, shuW, winH)

      // Shutter slats
      ctx.strokeStyle = 'rgba(0,0,0,0.30)'
      ctx.lineWidth = 1
      for (let s = 1; s < 5; s++) {
        const sy = wy + (s / 5) * winH
        ctx.beginPath(); ctx.moveTo(wx - shuW - 2, sy); ctx.lineTo(wx - 2, sy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(wx + winW + 2, sy); ctx.lineTo(wx + winW + 2 + shuW, sy); ctx.stroke()
      }
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
  return (
    <mesh position={[0, -0.78, 6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.2, 8, 1, 1]} />
      <shaderMaterial
        vertexShader={WAKE_VERT}
        fragmentShader={WAKE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Harbor buildings ──────────────────────────────────────────────────────────

interface BuildingCfg {
  x: number; z: number
  w: number; h: number; d: number
  color: string
  floors?: number; cols?: number
  rowY?: number
}

const BUILDINGS: BuildingCfg[] = [
  // ── Front waterfront row ──────────────────────────────────────────────────
  { x: -13, z: -20, w: 3.6, h:  9, d: 3.0, color: '#C84B31', floors: 3, cols: 2 },
  { x:  -9, z: -21, w: 4.2, h: 14, d: 3.0, color: '#F0D090', floors: 4, cols: 3 },
  { x:  -5, z: -21, w: 3.2, h: 11, d: 3.0, color: '#E8845C', floors: 3, cols: 2 },
  { x:  -1, z: -22, w: 4.6, h: 16, d: 3.0, color: '#E6B870', floors: 5, cols: 3 },
  { x:   4, z: -22, w: 3.8, h: 12, d: 3.0, color: '#FAFAF8', floors: 4, cols: 3 },
  { x:   8, z: -21, w: 4.0, h: 13, d: 3.0, color: '#C84B31', floors: 4, cols: 3 },
  { x:  12, z: -20, w: 3.4, h: 10, d: 3.0, color: '#E8845C', floors: 3, cols: 2 },
  { x:  16, z: -19, w: 4.0, h:  9, d: 3.0, color: '#F0D090', floors: 3, cols: 3 },
  { x:  20, z: -18, w: 3.6, h:  8, d: 3.0, color: '#D4956A', floors: 3, cols: 2 },
  // ── Second row (elevated on hillside) ─────────────────────────────────────
  { x: -11, z: -26, w: 3.0, h:  7, d: 3.0, color: '#FAFAF8', rowY: 1.5, floors: 2, cols: 2 },
  { x:  -7, z: -27, w: 3.5, h:  9, d: 3.0, color: '#E6B870', rowY: 2.0, floors: 3, cols: 2 },
  { x:  -3, z: -28, w: 3.0, h:  8, d: 3.0, color: '#C84B31', rowY: 2.5, floors: 3, cols: 2 },
  { x:   1, z: -28, w: 4.0, h: 10, d: 3.0, color: '#E8845C', rowY: 2.5, floors: 3, cols: 3 },
  { x:   5, z: -28, w: 3.0, h:  8, d: 3.0, color: '#F0D090', rowY: 2.5, floors: 3, cols: 2 },
  { x:   9, z: -27, w: 3.5, h:  9, d: 3.0, color: '#D4956A', rowY: 2.0, floors: 3, cols: 2 },
  { x:  13, z: -26, w: 3.0, h:  7, d: 3.0, color: '#FAFAF8', rowY: 1.5, floors: 2, cols: 2 },
  // ── Far-left wing (left headland) ─────────────────────────────────────────
  { x: -17, z: -18, w: 3.5, h: 10, d: 3.0, color: '#E8845C', floors: 3, cols: 2 },
  { x: -20, z: -16, w: 3.0, h:  8, d: 3.0, color: '#F0D090', floors: 3, cols: 2 },
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
          castShadow receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            map={textures[i]}
            roughness={0.82}
            metalness={0.0}
          />
        </mesh>
      ))}

      {/* Terracotta rooftops on front row */}
      {BUILDINGS.slice(0, 9).map((b, i) => (
        <mesh
          key={`roof-${i}`}
          position={[b.x, (b.rowY ?? 0) + b.h - 1.0 + 0.55, b.z]}
          castShadow
        >
          <boxGeometry args={[b.w + 0.1, 0.35, b.d + 0.1]} />
          <meshStandardMaterial color="#8C3A1C" roughness={0.9} />
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
    <group position={[10, 4, -31]}>
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
    <group position={[-19, 7, -26]}>
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

  return (
    <group ref={boatRef} position={[18, 0, -6]}>

      {/* ── Hull ─────────────────────────────────────────────────────────── */}
      {/* Main hull body */}
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[2.6, 0.72, 9.0]} />
        <meshStandardMaterial color="#1E3A5F" metalness={0.15} roughness={0.7} />
      </mesh>
      {/* Deck (white) */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[2.4, 0.10, 8.6]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.6} />
      </mesh>
      {/* Waterline stripe (blue) */}
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[2.62, 0.08, 9.04]} />
        <meshStandardMaterial color="#C49A3C" metalness={0.2} roughness={0.4} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.70, 1.2]}>
        <boxGeometry args={[1.8, 0.75, 3.2]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.5} />
      </mesh>
      {/* Cabin windows */}
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 0.72, 1.2]}>
          <planeGeometry args={[0.4, 0.28]} />
          <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Bow and stern finishing */}
      <mesh position={[0, -0.20, -4.6]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[2.0, 0.65, 0.8]} />
        <meshStandardMaterial color="#1E3A5F" />
      </mesh>

      {/* ── Mast ─────────────────────────────────────────────────────────── */}
      <mesh position={[0, 4.2, 0.8]}>
        <cylinderGeometry args={[0.07, 0.10, 9.5, 8]} />
        <meshStandardMaterial color="#8B7355" metalness={0.2} roughness={0.7} />
      </mesh>

      {/* ── Boom ─────────────────────────────────────────────────────────── */}
      <mesh position={[0, 1.1, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.055, 5.5, 6]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>

      {/* ── Rigging lines ─────────────────────────────────────────────────── */}
      <RiggingLines />

      {/* ── Jib sail (small front sail) ───────────────────────────────────── */}
      <JibSail />

      {/* ── Main sail — proper Bermuda rig triangle (cream canvas) ───────── */}
      <MainSail />


      {/* ── Animated wake foam trail ─────────────────────────────────────── */}
      <WakeTrail />
    </group>
  )
}

// ── Rigging lines ─────────────────────────────────────────────────────────────

function RiggingLines() {
  const LINES = useMemo(() => {
    const create = (start: THREE.Vector3, end: THREE.Vector3) => {
      const geo = new THREE.BufferGeometry().setFromPoints([start, end])
      return geo
    }
    return [
      // Forestay: mast top → bow
      create(new THREE.Vector3(0, 9, 0.8), new THREE.Vector3(0, 0.3, -4.2)),
      // Port shroud
      create(new THREE.Vector3(0, 7.5, 0.8), new THREE.Vector3(-1.2, 0.3, 1.0)),
      // Starboard shroud
      create(new THREE.Vector3(0, 7.5, 0.8), new THREE.Vector3( 1.2, 0.3, 1.0)),
      // Backstay: mast top → stern
      create(new THREE.Vector3(0, 9, 0.8), new THREE.Vector3(0, 0.3, 4.2)),
    ]
  }, [])

  return (
    <>
      {LINES.map((geo, i) => (
        <line key={i}>
          <bufferGeometry {...geo} />
          <lineBasicMaterial color="#C49A3C" transparent opacity={0.5} />
        </line>
      ))}
    </>
  )
}

// ── Jib sail ──────────────────────────────────────────────────────────────────

function JibSail() {
  const geo = useMemo(() => {
    const v = new Float32Array([
      0,   0.3, -3.8,    // clew (bow attachment)
      0,   9.0,  0.8,    // head (mast top)
      0,   1.2,  0.8,    // tack (mast base)
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
        color="#F5F0E8"
        side={THREE.DoubleSide}
        roughness={0.6}
        transparent
        opacity={0.88}
      />
    </mesh>
  )
}

// ── Main sail (proper Bermuda rig triangle) ───────────────────────────────────
//   Head:  mast top (0, 9.0, 0.8)
//   Tack:  mast base / boom jaw (0, 1.05, 0.8)
//   Clew:  boom end (0, 1.05, 3.5)   ← stern side, opposite to bow
// Two triangles for front + back faces with slight billow offset

function MainSail() {
  const geo = useMemo(() => {
    // Slight belly/billow: push mid-chord forward a touch
    const v = new Float32Array([
      // Face 1 (front)
       0.00, 9.00,  0.80,   // head
      -0.12, 4.80,  2.00,   // mid-luff with billow
       0.00, 1.05,  0.80,   // tack
       0.00, 1.05,  3.50,   // clew
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    // Two triangles: head–mid–tack and head–clew–mid
    g.setIndex([0, 2, 3,  0, 3, 1,  0, 1, 2])
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color="#F2EDE0"
        side={THREE.DoubleSide}
        roughness={0.65}
        transparent
        opacity={0.92}
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
      <HarborQuay />       {/* stone promenade + seawall — anchors buildings to water */}
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
            camera={{ position: [0, 3.5, 18], fov: 55, near: 0.1, far: 200 }}
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
