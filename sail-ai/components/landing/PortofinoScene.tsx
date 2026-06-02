/**
 * components/landing/PortofinoScene.tsx — VR-Quality Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Maximum-realism Three.js Portofino harbour — immersive "on the water" feel.
 *
 * Upgrades over v1:
 *   Water    — 4-component Gerstner wave shader with analytically computed normals,
 *              Fresnel sky-reflection, champagne sun specular, crest foam
 *   Wake     — animated V-shaped foam trail behind the sailboat (value-noise shader)
 *   Post-FX  — EffectComposer: Bloom (mipmapBlur), ACES Filmic ToneMapping,
 *              DepthOfField, ChromaticAberration, Vignette, HueSaturation, GodRays
 *   Sun disc — bright sphere at sky position feeds GodRays
 *   Buildings— canvas-generated wall textures: windows, shutters, weathering
 *   Seagulls — 7 wing-flapping birds in lazy orbits over the harbour
 *   Camera   — lower "on-the-water" position [0, 2.5, 18], gentle sinusoidal bob
 *   Sea spray— drei <Sparkles> at the bow of the sailboat
 *   Shadows  — soft shadow map on Canvas
 *   dpr      — [1, 2] device pixel ratio
 */
'use client'

import dynamic                                          from 'next/dynamic'
import { useRef, useMemo, useEffect, useState }         from 'react'
import { useFrame, useThree }                           from '@react-three/fiber'
import { Sky, Sparkles }                                from '@react-three/drei'
import {
  EffectComposer, Bloom, DepthOfField,
  ChromaticAberration, Vignette, ToneMapping,
  GodRays, HueSaturation,
}                                                       from '@react-three/postprocessing'
import { ToneMappingMode }                              from 'postprocessing'
import * as THREE                                       from 'three'
import { useNarrative, NODE_ORDER }                     from './narrativeStore'

// ── GLSL: Gerstner Water vertex ───────────────────────────────────────────────

const WATER_VERT = /* glsl */`
precision highp float;

uniform float uTime;
uniform float uWaveScale;

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;
varying vec3  vNormal;

/*
 * Gerstner wave: realistic directional ocean wave.
 * Accumulates displacement AND analytically computes tangent/bitangent
 * for accurate per-vertex normals (no screen-space artifacts).
 *
 *   dir    — normalised 2-D wave propagation direction (xz-plane)
 *   amp    — wave amplitude (half peak-to-trough)
 *   freq   — spatial frequency k = 2π/wavelength
 *   speed  — angular frequency ω = sqrt(g·k)
 *   steep  — Q in [0,1]: 0 = sine, 1 = sharp peaked cycloidal crest
 */
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

  // Four Gerstner wave components — primary swell + secondary + two chop layers
  GWave w0 = GWave(normalize(vec2( 1.0,  0.6)), 0.19, 0.52, 1.14, 0.48);
  GWave w1 = GWave(normalize(vec2(-0.3,  1.0)), 0.11, 0.79, 1.39, 0.38);
  GWave w2 = GWave(normalize(vec2( 0.8, -0.5)), 0.07, 1.57, 1.97, 0.28);
  GWave w3 = GWave(normalize(vec2(-0.5, -0.8)), 0.04, 2.51, 2.49, 0.22);

  vec3 tangent   = vec3(1.0, 0.0, 0.0);
  vec3 bitangent = vec3(0.0, 0.0, 1.0);
  vec3 disp      = vec3(0.0);

  float t = uTime;
  disp += gerstner(w0, xz, t, tangent, bitangent);
  disp += gerstner(w1, xz, t, tangent, bitangent);
  disp += gerstner(w2, xz, t, tangent, bitangent);
  disp += gerstner(w3, xz, t, tangent, bitangent);

  vec3 pos  = position + disp;
  vElevation = disp.y;

  // Analytical normal (exact, no derivative jitter)
  vNormal = normalize(cross(bitangent, tangent));

  vec4 world4 = modelMatrix * vec4(pos, 1.0);
  vWorldPos   = world4.xyz;
  gl_Position = projectionMatrix * viewMatrix * world4;
}
`

// ── GLSL: Gerstner Water fragment ─────────────────────────────────────────────

const WATER_FRAG = /* glsl */`
precision highp float;

uniform vec3  uDeepColor;
uniform vec3  uSurfaceColor;
uniform vec3  uSunDir;
uniform float uProgress;

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;
varying vec3  vNormal;

void main() {
  vec3 N = normalize(vNormal);

  // View direction toward camera
  vec3  V       = normalize(cameraPosition - vWorldPos);

  // ── Base water colour ─────────────────────────────────────────────────
  float t     = clamp((vElevation + 0.32) * 2.2, 0.0, 1.0);
  vec3  water = mix(uDeepColor, uSurfaceColor, t);

  // Golden-hour tint grows with boat progress (dusk shift)
  water = mix(water, water * vec3(1.20, 0.94, 0.68), uProgress * 0.65);

  // ── Fresnel sky reflection ────────────────────────────────────────────
  float cosTheta  = max(dot(N, V), 0.0);
  float fresnel   = 0.04 + 0.96 * pow(1.0 - cosTheta, 4.5);
  // Approximate sky colour by elevation of normal (simplified skybox gradient)
  float skyBlend  = clamp(N.y * 1.5, 0.0, 1.0);
  vec3  skyTop    = mix(vec3(0.55, 0.74, 0.92), vec3(0.70, 0.50, 0.28), uProgress * 0.7);
  vec3  skyHoriz  = mix(vec3(0.75, 0.88, 0.98), vec3(0.85, 0.65, 0.35), uProgress * 0.7);
  vec3  skyRefl   = mix(skyHoriz, skyTop, skyBlend);
  water           = mix(water, skyRefl, fresnel * 0.62);

  // ── Champagne-gold Blinn-Phong sun specular ───────────────────────────
  vec3  H        = normalize(uSunDir + V);
  float spec     = pow(max(dot(N, H), 0.0), 180.0);
  vec3  goldSpec = mix(vec3(0.97, 0.88, 0.50), vec3(0.98, 0.65, 0.28), uProgress);
  water         += goldSpec * spec * mix(0.60, 1.40, uProgress);

  // Secondary broader specular lobe
  float spec2    = pow(max(dot(N, H), 0.0), 28.0);
  water         += goldSpec * spec2 * mix(0.08, 0.18, uProgress);

  // ── Crest foam ───────────────────────────────────────────────────────
  float foam = smoothstep(0.24, 0.40, vElevation);
  water = mix(water, vec3(0.97, 0.99, 1.0), foam * 0.32);

  // ── Subsurface scatter tint at shallow angles ─────────────────────────
  float sss = pow(max(1.0 - cosTheta, 0.0), 2.5) * 0.15;
  water    += vec3(0.10, 0.30, 0.28) * sss;

  // ── Horizon depth fade ────────────────────────────────────────────────
  float horizon = smoothstep(0.20, 0.70, vUv.y);
  water = mix(water * 0.55, water, horizon);

  gl_FragColor = vec4(water, mix(0.90, 0.97, horizon));
}
`

// ── GLSL: Wake foam ───────────────────────────────────────────────────────────

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

// Value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),           hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  // V-wake shape: narrow near stern, widens aft
  float cx      = abs(vUv.x - 0.5) * 2.0;
  float vAngle  = cx - vUv.y * 0.9;
  float vShape  = 1.0 - smoothstep(0.0, 0.18, vAngle);

  // Turbulent foam layers
  float n1 = valueNoise(vUv * vec2(6.0, 14.0) + vec2(0.0, -uTime * 1.8));
  float n2 = valueNoise(vUv * vec2(14.0, 28.0) + vec2(uTime * 0.6, -uTime * 2.4));
  float foam = (n1 * 0.55 + n2 * 0.45) * vShape;

  // Fade at far end (UV.y=1 is farthest from boat)
  float alpha = foam * (1.0 - vUv.y * 0.8) * 0.55;

  gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(alpha, 0.0, 1.0));
}
`

// ── Canvas building texture generator ────────────────────────────────────────

function makeWallTexture(baseHex: string, floors = 4, cols = 3): THREE.CanvasTexture {
  const W = 256, H = 512
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!

  // Base plaster fill
  ctx.fillStyle = baseHex
  ctx.fillRect(0, 0, W, H)

  // Weathering: darker at base, lighter wash at top
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

  // Windows
  const cellW  = W / cols
  const cellH  = H / floors
  const winW   = cellW  * 0.36
  const winH   = cellH  * 0.38
  const shuW   = winW   * 0.38

  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cellW + (cellW - winW) / 2
      const wy = r * cellH + cellH * 0.22

      // Sill ledge
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(wx - 3, wy + winH, winW + 6, 4)

      // Frame
      ctx.fillStyle = '#3C2810'
      ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4)

      // Glass — slight sky-blue tint
      ctx.fillStyle = '#6B9EC0'
      ctx.fillRect(wx, wy, winW, winH)

      // Inner shadow on glass
      const glassShadow = ctx.createLinearGradient(wx, wy, wx + winW, wy + winH)
      glassShadow.addColorStop(0, 'rgba(0,0,0,0.30)')
      glassShadow.addColorStop(0.5, 'rgba(0,0,0,0.0)')
      glassShadow.addColorStop(1, 'rgba(0,0,0,0.15)')
      ctx.fillStyle = glassShadow
      ctx.fillRect(wx, wy, winW, winH)

      // Mullions
      ctx.fillStyle = '#3C2810'
      ctx.fillRect(wx + winW / 2 - 1, wy, 2, winH)
      ctx.fillRect(wx, wy + winH / 2 - 1, winW, 2)

      // Shutters (dark green, partially open)
      ctx.fillStyle = '#1F4A2C'
      ctx.fillRect(wx - shuW - 2, wy, shuW, winH)
      ctx.fillRect(wx + winW + 2,  wy, shuW, winH)

      // Shutter slats
      ctx.strokeStyle = 'rgba(0,0,0,0.30)'
      ctx.lineWidth = 1
      const slats = 5
      for (let s = 1; s < slats; s++) {
        const sy = wy + (s / slats) * winH
        ctx.beginPath(); ctx.moveTo(wx - shuW - 2, sy); ctx.lineTo(wx - 2, sy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(wx + winW + 2, sy); ctx.lineTo(wx + winW + 2 + shuW, sy); ctx.stroke()
      }
    }
  }

  return new THREE.CanvasTexture(cv)
}

// ── Water surface ─────────────────────────────────────────────────────────────

function WaterSurface() {
  const { node }      = useNarrative()
  const progressRef   = useRef(0)
  const { camera }    = useThree()

  const uniforms = useMemo(() => ({
    uTime:         { value: 0.0 },
    uWaveScale:    { value: 0.38 },
    uProgress:     { value: 0.0 },
    uDeepColor:    { value: new THREE.Color('#041220') },
    uSurfaceColor: { value: new THREE.Color('#0D9B8A') },
    uSunDir:       { value: new THREE.Vector3(0.55, 0.72, -0.42).normalize() },
  }), [])

  useEffect(() => {
    progressRef.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(({ clock }) => {
    uniforms.uTime.value     = clock.getElapsedTime()
    const target             = progressRef.current
    uniforms.uProgress.value += (target - uniforms.uProgress.value) * 0.006

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
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Wake foam trail (child of sailboat group) ─────────────────────────────────

function WakeTrail() {
  const uniforms = useMemo(() => ({
    uTime: { value: 0.0 },
  }), [])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime()
  })

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

// ── Harbor buildings with canvas-generated wall textures ─────────────────────

interface BuildingCfg {
  x: number; z: number
  w: number; h: number; d: number
  color: string
  floors?: number
  cols?: number
  rowY?: number
}

const BUILDINGS: BuildingCfg[] = [
  // Front waterfront row
  { x: -13, z: -20, w: 3.6, h:  9, d: 3.0, color: '#C84B31', floors: 3, cols: 2 },
  { x:  -9, z: -21, w: 4.2, h: 14, d: 3.0, color: '#F0D090', floors: 4, cols: 3 },
  { x:  -5, z: -21, w: 3.2, h: 11, d: 3.0, color: '#E8845C', floors: 3, cols: 2 },
  { x:  -1, z: -22, w: 4.6, h: 16, d: 3.0, color: '#E6B870', floors: 5, cols: 3 },
  { x:   4, z: -22, w: 3.8, h: 12, d: 3.0, color: '#FAFAF8', floors: 4, cols: 3 },
  { x:   8, z: -21, w: 4.0, h: 13, d: 3.0, color: '#C84B31', floors: 4, cols: 3 },
  { x:  12, z: -20, w: 3.4, h: 10, d: 3.0, color: '#E8845C', floors: 3, cols: 2 },
  { x:  16, z: -19, w: 4.0, h:  9, d: 3.0, color: '#F0D090', floors: 3, cols: 3 },
  { x:  20, z: -18, w: 3.6, h:  8, d: 3.0, color: '#D4956A', floors: 3, cols: 2 },
  // Second row (elevated on hillside)
  { x: -11, z: -26, w: 3.0, h:  7, d: 3.0, color: '#FAFAF8', rowY: 1.5, floors: 2, cols: 2 },
  { x:  -7, z: -27, w: 3.5, h:  9, d: 3.0, color: '#E6B870', rowY: 2.0, floors: 3, cols: 2 },
  { x:  -3, z: -28, w: 3.0, h:  8, d: 3.0, color: '#C84B31', rowY: 2.5, floors: 3, cols: 2 },
  { x:   1, z: -28, w: 4.0, h: 10, d: 3.0, color: '#E8845C', rowY: 2.5, floors: 3, cols: 3 },
  { x:   5, z: -28, w: 3.0, h:  8, d: 3.0, color: '#F0D090', rowY: 2.5, floors: 3, cols: 2 },
  { x:   9, z: -27, w: 3.5, h:  9, d: 3.0, color: '#D4956A', rowY: 2.0, floors: 3, cols: 2 },
  { x:  13, z: -26, w: 3.0, h:  7, d: 3.0, color: '#FAFAF8', rowY: 1.5, floors: 2, cols: 2 },
  // Left headland
  { x: -17, z: -18, w: 3.5, h: 10, d: 3.0, color: '#E8845C', floors: 3, cols: 2 },
  { x: -20, z: -16, w: 3.0, h:  8, d: 3.0, color: '#F0D090', floors: 3, cols: 2 },
]

function HarborBuildings() {
  // Build one texture per unique color, cached
  const textures = useMemo(() => {
    const cache = new Map<string, THREE.CanvasTexture>()
    return BUILDINGS.map(b => {
      const key = `${b.color}-${b.floors ?? 4}-${b.cols ?? 3}`
      if (!cache.has(key)) cache.set(key, makeWallTexture(b.color, b.floors, b.cols))
      return cache.get(key)!
    })
  }, [])

  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, (b.rowY ?? 0) + b.h / 2 - 1.0, b.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            map={textures[i]}
            roughness={0.82}
            metalness={0.0}
            envMapIntensity={0.4}
          />
        </mesh>
      ))}

      {/* Rooftops — terracotta tile color */}
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

// ── Castello Brown ────────────────────────────────────────────────────────────

function Castello() {
  return (
    <group position={[-19, 7, -26]}>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 6, 4]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
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

// ── Pier / dock ───────────────────────────────────────────────────────────────

function Pier() {
  return (
    <group position={[-11, -0.6, -6]}>
      <mesh receiveShadow>
        <boxGeometry args={[3.5, 0.25, 14]} />
        <meshStandardMaterial color="#8B6E4E" roughness={0.95} />
      </mesh>
      {[-5, -1, 3].map((z, i) => (
        <mesh key={i} position={[1.5, 0.4, z]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.9, 6]} />
          <meshStandardMaterial color="#555550" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[3, -0.1, -3]} castShadow>
        <boxGeometry args={[1.2, 0.4, 3.5]} />
        <meshStandardMaterial color="#E8E0D0" roughness={0.8} />
      </mesh>
      <mesh position={[3, -0.1, 2]} castShadow>
        <boxGeometry args={[1.0, 0.35, 2.8]} />
        <meshStandardMaterial color="#C84B31" roughness={0.8} />
      </mesh>
    </group>
  )
}

// ── Seagulls ─────────────────────────────────────────────────────────────────

const GULL_CONFIGS = [
  { orbitR: 14, height: 9.0, orbitS: 0.080, offset: 0.00, wingS: 2.6, sc: 0.50 },
  { orbitR: 18, height: 11.5, orbitS: 0.062, offset: 0.90, wingS: 2.1, sc: 0.62 },
  { orbitR: 10, height: 7.5, orbitS: 0.105, offset: 1.80, wingS: 3.0, sc: 0.44 },
  { orbitR: 22, height: 14.0, orbitS: 0.048, offset: 2.70, wingS: 1.8, sc: 0.70 },
  { orbitR: 16, height: 10.0, orbitS: 0.072, offset: 3.60, wingS: 2.4, sc: 0.55 },
  { orbitR: 12, height: 8.5, orbitS: 0.090, offset: 4.50, wingS: 2.8, sc: 0.48 },
  { orbitR: 20, height: 12.5, orbitS: 0.055, offset: 5.40, wingS: 2.0, sc: 0.65 },
]

function Seagulls() {
  const gullRefs  = useRef<(THREE.Group | null)[]>([])
  const lWingRefs = useRef<(THREE.Mesh | null)[]>([])
  const rWingRefs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    GULL_CONFIGS.forEach((g, i) => {
      const gull  = gullRefs.current[i]
      const lWing = lWingRefs.current[i]
      const rWing = rWingRefs.current[i]
      if (!gull) return

      const angle = t * g.orbitS + g.offset
      gull.position.set(
        Math.cos(angle) * g.orbitR - 2,
        g.height + Math.sin(t * 0.28 + g.offset) * 0.9,
        Math.sin(angle) * g.orbitR * 0.55 - 16,
      )
      // Face direction of flight
      gull.rotation.y = -angle + Math.PI * 0.5

      // Wing flap
      const flap = Math.sin(t * g.wingS) * 0.42
      if (lWing) lWing.rotation.z = flap
      if (rWing) rWing.rotation.z = -flap
    })
  })

  return (
    <group>
      {GULL_CONFIGS.map((g, i) => (
        <group
          key={i}
          ref={el => { gullRefs.current[i] = el }}
          scale={g.sc}
        >
          {/* Body */}
          <mesh>
            <sphereGeometry args={[0.18, 6, 4]} />
            <meshStandardMaterial color="#F5F5F5" roughness={0.6} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.10, -0.22]}>
            <sphereGeometry args={[0.11, 5, 4]} />
            <meshStandardMaterial color="#EFEFEF" roughness={0.6} />
          </mesh>
          {/* Left wing — pivot at body center */}
          <mesh
            ref={el => { lWingRefs.current[i] = el }}
            position={[-0.52, 0, 0]}
          >
            <planeGeometry args={[1.0, 0.18]} />
            <meshStandardMaterial color="#F0F0F0" side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
          {/* Right wing */}
          <mesh
            ref={el => { rWingRefs.current[i] = el }}
            position={[0.52, 0, 0]}
          >
            <planeGeometry args={[1.0, 0.18]} />
            <meshStandardMaterial color="#F0F0F0" side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Boat path ─────────────────────────────────────────────────────────────────

const HARBOR_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(18,  0.0, -6),
  new THREE.Vector3(12,  0.0, -3),
  new THREE.Vector3( 6,  0.0,  0),
  new THREE.Vector3( 0,  0.0,  2),
  new THREE.Vector3(-5,  0.0,  4),
  new THREE.Vector3(-8,  0.0,  5),
])

// ── Rigging lines ─────────────────────────────────────────────────────────────

function RiggingLines() {
  const lines = useMemo(() => {
    const pts: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(0, 9, 0.8), new THREE.Vector3(0, 0.3, -4.2)],  // forestay
      [new THREE.Vector3(0, 7.5, 0.8), new THREE.Vector3(-1.2, 0.3, 1.0)], // port shroud
      [new THREE.Vector3(0, 7.5, 0.8), new THREE.Vector3(1.2, 0.3, 1.0)],  // stbd shroud
      [new THREE.Vector3(0, 9, 0.8), new THREE.Vector3(0, 0.3, 4.2)],   // backstay
    ]
    return pts.map(([s, e]) =>
      new THREE.BufferGeometry().setFromPoints([s, e])
    )
  }, [])

  return (
    <>
      {lines.map((geo, i) => (
        <line key={i}>
          <bufferGeometry {...geo} />
          <lineBasicMaterial color="#C49A3C" transparent opacity={0.55} />
        </line>
      ))}
    </>
  )
}

// ── Jib sail ──────────────────────────────────────────────────────────────────

function JibSail() {
  const geo = useMemo(() => {
    const v = new Float32Array([
      0,  0.3, -3.8,
      0,  9.0,  0.8,
      0,  1.2,  0.8,
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.setIndex([0, 1, 2])
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial
        color="#F5F0E8"
        side={THREE.DoubleSide}
        roughness={0.55}
        transparent
        opacity={0.90}
      />
    </mesh>
  )
}

// ── Sailboat with iPhone mainsail ─────────────────────────────────────────────

function SailboatWithPhone() {
  const boatRef       = useRef<THREE.Group>(null)
  const iphoneGlowRef = useRef<THREE.MeshStandardMaterial>(null)
  const { node }      = useNarrative()

  const targetProgress = useRef(0)
  const smoothProgress = useRef(0)

  useEffect(() => {
    targetProgress.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(({ clock }) => {
    if (!boatRef.current) return
    const t = clock.getElapsedTime()

    smoothProgress.current += (targetProgress.current - smoothProgress.current) * 0.010

    const p   = Math.min(Math.max(smoothProgress.current, 0), 0.9999)
    const pos = HARBOR_PATH.getPoint(p)
    const tan = HARBOR_PATH.getTangent(p)

    boatRef.current.position.copy(pos)
    boatRef.current.position.y = 0
    boatRef.current.rotation.y = Math.atan2(tan.x, tan.z)

    // Gentle wave-induced rocking
    boatRef.current.rotation.x = Math.sin(t * 0.38) * 0.028
    boatRef.current.rotation.z = Math.sin(t * 0.29 + 1.3) * 0.022

    // iPhone screen glow — teal at intro, gold as progress rises
    if (iphoneGlowRef.current) {
      const glowIntensity = 0.20 + Math.sin(t * 1.2) * 0.07 + smoothProgress.current * 0.18
      iphoneGlowRef.current.emissiveIntensity = glowIntensity
      // Shift from tiffany → gold as narrative advances
      iphoneGlowRef.current.emissive.setStyle(
        smoothProgress.current < 0.5 ? '#14B8A6' : '#C49A3C'
      )
    }
  })

  return (
    <group ref={boatRef} position={[18, 0, -6]}>

      {/* Hull body */}
      <mesh position={[0, -0.22, 0]} castShadow>
        <boxGeometry args={[2.6, 0.72, 9.0]} />
        <meshStandardMaterial color="#1E3A5F" metalness={0.18} roughness={0.65} />
      </mesh>
      {/* Deck */}
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.10, 8.6]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.55} />
      </mesh>
      {/* Waterline stripe — champagne gold */}
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[2.62, 0.09, 9.04]} />
        <meshStandardMaterial color="#C49A3C" metalness={0.25} roughness={0.40} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.70, 1.2]} castShadow>
        <boxGeometry args={[1.8, 0.75, 3.2]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.5} />
      </mesh>
      {/* Cabin windows */}
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 0.72, 1.2]}>
          <planeGeometry args={[0.4, 0.28]} />
          <meshStandardMaterial
            color="#87CEEB"
            emissive="#4A9FC8"
            emissiveIntensity={0.35}
            roughness={0.05}
          />
        </mesh>
      ))}
      {/* Bow finishing */}
      <mesh position={[0, -0.20, -4.6]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[2.0, 0.65, 0.8]} />
        <meshStandardMaterial color="#1E3A5F" />
      </mesh>

      {/* Mast */}
      <mesh position={[0, 4.2, 0.8]} castShadow>
        <cylinderGeometry args={[0.07, 0.10, 9.5, 8]} />
        <meshStandardMaterial color="#8B7355" metalness={0.22} roughness={0.65} />
      </mesh>

      {/* Boom */}
      <mesh position={[0, 1.1, -0.6]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 5.5, 6]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>

      <RiggingLines />
      <JibSail />

      {/* iPhone as mainsail */}
      <group position={[0, 4.8, 0.4]} rotation={[0.15, 0, 0.04]}>
        {/* Phone body — space black titanium */}
        <mesh castShadow>
          <boxGeometry args={[2.10, 4.55, 0.14]} />
          <meshStandardMaterial color="#1C1C1E" metalness={0.88} roughness={0.12} />
        </mesh>
        {/* Screen — animated teal/gold glow */}
        <mesh position={[0, 0, 0.075]}>
          <planeGeometry args={[1.88, 4.10]} />
          <meshStandardMaterial
            ref={iphoneGlowRef}
            color="#0A1A2A"
            emissive="#14B8A6"
            emissiveIntensity={0.22}
            roughness={0.04}
            metalness={0.0}
          />
        </mesh>
        {/* UI data lines (gold) */}
        {[1.2, 0.4, -0.4, -1.2].map((y, i) => (
          <mesh key={i} position={[0.06, y, 0.077]}>
            <planeGeometry args={[i === 0 ? 1.10 : 0.65 + i * 0.15, 0.040]} />
            <meshStandardMaterial
              color="#C49A3C"
              emissive="#C49A3C"
              emissiveIntensity={0.7}
            />
          </mesh>
        ))}
        {/* Dynamic Island */}
        <mesh position={[0, 1.95, 0.078]}>
          <capsuleGeometry args={[0.09, 0.28, 8, 16]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
        {/* Edge glow halo */}
        <mesh position={[0, 0, 0.073]}>
          <planeGeometry args={[1.92, 4.14]} />
          <meshStandardMaterial
            color="#14B8A6"
            emissive="#14B8A6"
            emissiveIntensity={0.06}
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Sea spray at bow */}
      <Sparkles
        position={[0, 0.5, -4.5]}
        count={28}
        scale={[1.6, 1.2, 0.8]}
        size={1.2}
        speed={0.5}
        opacity={0.55}
        color="#CCEEFF"
      />

      {/* Animated wake foam trail */}
      <WakeTrail />
    </group>
  )
}

// ── Camera rig — gentle ocean bob ─────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree()
  // Lower perspective: "on the water" feel
  const base = useMemo(() => new THREE.Vector3(0, 2.5, 18), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = base.x + Math.sin(t * 0.22) * 0.09
    camera.position.y = base.y + Math.sin(t * 0.40) * 0.06
    camera.position.z = base.z + Math.sin(t * 0.18) * 0.05
  })

  return null
}

// ── Scene lighting (sun-reactive) ─────────────────────────────────────────────

function SceneLighting() {
  const dirRef      = useRef<THREE.DirectionalLight>(null)
  const { node }    = useNarrative()
  const progressRef = useRef(0)

  useEffect(() => {
    progressRef.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(() => {
    if (!dirRef.current) return
    const p = progressRef.current
    dirRef.current.position.set(8 - p * 10, 14 - p * 8, 6)
    dirRef.current.color.setRGB(1.0, 1.0 - p * 0.20, 0.90 - p * 0.38)
    dirRef.current.intensity = 1.6 + p * 0.9
  })

  return (
    <>
      <ambientLight intensity={0.50} color="#C4D0E8" />
      <directionalLight
        ref={dirRef}
        position={[8, 14, 6]}
        intensity={1.6}
        color="#FFFFFF"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={['#87CEEB', '#3A6B40', 0.32]} />
    </>
  )
}

// ── Sky ───────────────────────────────────────────────────────────────────────

function SceneSky() {
  return (
    <Sky
      distance={4500}
      sunPosition={[0.55, 0.72, -0.42]}
      turbidity={5.5}
      rayleigh={1.9}
      mieCoefficient={0.005}
      mieDirectionalG={0.84}
    />
  )
}

// ── Fog ───────────────────────────────────────────────────────────────────────

function SceneFog() {
  return <fog attach="fog" args={['#B8CCDF', 32, 72]} />
}

// ── Sun disc mesh (feeds GodRays) ─────────────────────────────────────────────
// Position matches Sky's sunPosition direction scaled to a visible world distance.

const SUN_POS: [number, number, number] = [28, 42, -38]

interface SunDiscProps {
  onReady: (mesh: THREE.Mesh) => void
}
function SunDisc({ onReady }: SunDiscProps) {
  const called = useRef(false)
  return (
    <mesh
      position={SUN_POS}
      ref={mesh => {
        if (mesh && !called.current) {
          called.current = true
          onReady(mesh)
        }
      }}
    >
      <sphereGeometry args={[2.8, 16, 16]} />
      {/* toneMapped=false lets Bloom pick up the HDR brightness */}
      <meshBasicMaterial color="#FFF5C8" toneMapped={false} />
    </mesh>
  )
}

// ── Post-processing pipeline ──────────────────────────────────────────────────
// EffectComposer requires every child to be a ReactElement — no null/undefined.
// JSX comments ({/* */}) evaluate to null so we keep this block comment-free.
// GodRays runs in a separate pass so it can be conditionally mounted without
// violating the strict children type of EffectComposer.

function PostFXBase() {
  return (
    <EffectComposer multisampling={0}>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.08}
        mipmapBlur
        radius={0.65}
      />
      <DepthOfField
        focusDistance={0.018}
        focalLength={0.055}
        bokehScale={2.2}
      />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0003, 0.0003)}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette eskil={false} offset={0.26} darkness={0.62} />
      <HueSaturation saturation={0.20} />
    </EffectComposer>
  )
}

// God rays in its own pass — mounted only once the sun mesh is ready.
function GodRaysPass({ sun }: { sun: THREE.Mesh }) {
  return (
    <EffectComposer multisampling={0}>
      <GodRays
        sun={sun}
        exposure={0.28}
        decay={0.92}
        density={0.82}
        weight={0.55}
        clampMax={1.0}
        blur
      />
    </EffectComposer>
  )
}

// ── Inner scene ───────────────────────────────────────────────────────────────

function PortofinoInner() {
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null)

  return (
    <>
      <SceneFog />
      <SceneLighting />
      <SceneSky />
      <SunDisc onReady={setSunMesh} />
      <WaterSurface />
      <HarborBuildings />
      <HillTerrain />
      <Church />
      <Castello />
      <Pier />
      <Seagulls />
      <SailboatWithPhone />
      <CameraRig />
      {/* Base cinematic effects — always active */}
      <PostFXBase />
      {/* God rays — mounted once the sun sphere mesh is ready */}
      {sunMesh && <GodRaysPass sun={sunMesh} />}
    </>
  )
}

// ── Dynamic Canvas export (no SSR) ────────────────────────────────────────────

export const PortofinoScene = dynamic(
  () =>
    import('@react-three/fiber').then(({ Canvas }) => {
      function PortofinoCanvas() {
        return (
          <Canvas
            camera={{ position: [0, 2.5, 18], fov: 65, near: 0.1, far: 200 }}
            style={{ position: 'fixed', inset: 0, zIndex: 0 }}
            gl={{ antialias: true, alpha: false }}
            shadows="soft"
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
