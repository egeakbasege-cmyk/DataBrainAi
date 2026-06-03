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

// ── GLSL: Water ───────────────────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
precision highp float;

uniform float uTime;
uniform float uWaveScale;

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;

float wave(float x, float z, float freq, float amp, float speed, float phase) {
  return sin(x * freq + z * freq * 0.5 + uTime * speed + phase) * amp;
}

void main() {
  vUv      = uv;
  vec3 pos = position;

  float e =
    wave(pos.x * uWaveScale, pos.z * uWaveScale, 0.9,  0.22, 0.75, 0.0) +
    wave(pos.x * uWaveScale, pos.z * uWaveScale, 1.4,  0.10, 1.10, 1.2) +
    wave(pos.x * uWaveScale, pos.z * uWaveScale, 0.45, 0.26, 0.50, 2.5) +
    wave(pos.z * uWaveScale, pos.x * uWaveScale, 0.65, 0.14, 0.70, 0.8);

  pos.y   += e;
  vElevation = e;

  vec4 world4 = modelMatrix * vec4(pos, 1.0);
  vWorldPos   = world4.xyz;

  gl_Position = projectionMatrix * viewMatrix * world4;
}
`

const WATER_FRAG = /* glsl */`
#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform vec3  uDeepColor;
uniform vec3  uSurfaceColor;
uniform vec3  uSunPos;
uniform float uProgress;

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;

void main() {
  // Per-fragment normal from screen-space derivatives
  vec3 dx   = dFdx(vWorldPos);
  vec3 dz   = dFdy(vWorldPos);
  vec3 norm = normalize(cross(dz, dx));

  // Base water colour
  float t      = clamp((vElevation + 0.55) * 1.3, 0.0, 1.0);
  vec3  water  = mix(uDeepColor, uSurfaceColor, t);

  // Golden-hour tint grows with boat progress
  water = mix(water, water * vec3(1.18, 0.96, 0.72), uProgress * 0.60);

  // Champagne-gold sun specular
  vec3  viewDir  = normalize(vec3(0.0, 1.0, 0.45));
  vec3  halfVec  = normalize(uSunPos + viewDir);
  float spec     = pow(max(dot(norm, halfVec), 0.0), 90.0);
  vec3  goldSpec = vec3(0.769, 0.604, 0.235);
  water         += goldSpec * spec * mix(0.50, 1.10, uProgress);

  // Foam at crests
  float foam = smoothstep(0.30, 0.46, vElevation);
  water = mix(water, vec3(0.96, 0.98, 1.0), foam * 0.28);

  // Horizon fade (softer blend to sky)
  float horizon = smoothstep(0.25, 0.65, vUv.y);
  water = mix(water * 0.6, water, horizon);

  gl_FragColor = vec4(water, mix(0.88, 0.95, horizon));
}
`

// ── Water component ───────────────────────────────────────────────────────────

function WaterSurface() {
  const { node } = useNarrative()
  const progressRef = useRef(0)

  const uniforms = useMemo(() => ({
    uTime:         { value: 0.0 },
    uWaveScale:    { value: 0.40 },
    uProgress:     { value: 0.0 },
    uDeepColor:    { value: new THREE.Color('#061428') },
    uSurfaceColor: { value: new THREE.Color('#14B8A6') },
    uSunPos:       { value: new THREE.Vector3(1.0, 0.5, -0.3) },
  }), [])

  useEffect(() => {
    progressRef.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    uniforms.uTime.value += 0.016
    const p = uniforms.uProgress.value
    const target = progressRef.current
    uniforms.uProgress.value += (target - p) * 0.006

    // Sun descends and shifts west → golden hour
    const pp = uniforms.uProgress.value
    uniforms.uSunPos.value.set(
      1.0 - pp * 0.45,
      0.60 - pp * 0.30,
      -0.30 + pp * 0.10,
    ).normalize()
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
      <planeGeometry args={[90, 70, 140, 140]} />
      <shaderMaterial
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms}
        transparent
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
  rowY?: number
}

const BUILDINGS: BuildingCfg[] = [
  // ── Front waterfront row ──────────────────────────────────────────────────
  { x: -13, z: -20, w: 3.6, h: 9,  d: 3.0, color: '#C84B31' },
  { x:  -9, z: -21, w: 4.2, h: 14, d: 3.0, color: '#F0D090' },
  { x:  -5, z: -21, w: 3.2, h: 11, d: 3.0, color: '#E8845C' },
  { x:  -1, z: -22, w: 4.6, h: 16, d: 3.0, color: '#E6B870' },
  { x:   4, z: -22, w: 3.8, h: 12, d: 3.0, color: '#FAFAF8' },
  { x:   8, z: -21, w: 4.0, h: 13, d: 3.0, color: '#C84B31' },
  { x:  12, z: -20, w: 3.4, h: 10, d: 3.0, color: '#E8845C' },
  { x:  16, z: -19, w: 4.0, h: 9,  d: 3.0, color: '#F0D090' },
  { x:  20, z: -18, w: 3.6, h: 8,  d: 3.0, color: '#D4956A' },
  // ── Second row (elevated on hillside) ─────────────────────────────────────
  { x: -11, z: -26, w: 3.0, h: 7,  d: 3.0, color: '#FAFAF8', rowY: 1.5 },
  { x:  -7, z: -27, w: 3.5, h: 9,  d: 3.0, color: '#E6B870', rowY: 2.0 },
  { x:  -3, z: -28, w: 3.0, h: 8,  d: 3.0, color: '#C84B31', rowY: 2.5 },
  { x:   1, z: -28, w: 4.0, h: 10, d: 3.0, color: '#E8845C', rowY: 2.5 },
  { x:   5, z: -28, w: 3.0, h: 8,  d: 3.0, color: '#F0D090', rowY: 2.5 },
  { x:   9, z: -27, w: 3.5, h: 9,  d: 3.0, color: '#D4956A', rowY: 2.0 },
  { x:  13, z: -26, w: 3.0, h: 7,  d: 3.0, color: '#FAFAF8', rowY: 1.5 },
  // ── Far-left wing (left headland) ─────────────────────────────────────────
  { x: -17, z: -18, w: 3.5, h: 10, d: 3.0, color: '#E8845C' },
  { x: -20, z: -16, w: 3.0, h: 8,  d: 3.0, color: '#F0D090' },
]

function HarborBuildings() {
  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, (b.rowY ?? 0) + b.h / 2 - 1.0, b.z]}
          castShadow={false}
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshLambertMaterial color={b.color} />
        </mesh>
      ))}

      {/* Green shutters as thin dark planes on select buildings */}
      {[[-1, 7, -22], [4, 5.5, -22], [-5, 4.5, -21]].map(([x, y, z], i) => (
        <mesh key={`shutter-${i}`} position={[x as number, y as number, z as number + 1.55]}>
          <planeGeometry args={[0.6, 1.4]} />
          <meshLambertMaterial color="#2D5A3D" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ── Hill terrain ──────────────────────────────────────────────────────────────

function HillTerrain() {
  return (
    <group>
      {/* Main hillside — large rounded mound behind buildings */}
      <mesh position={[0, 4, -35]}>
        <sphereGeometry args={[22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#3A6B40" side={THREE.BackSide} />
      </mesh>

      {/* Left headland hill */}
      <mesh position={[-22, 3, -22]}>
        <sphereGeometry args={[12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#2D5A35" side={THREE.BackSide} />
      </mesh>

      {/* Right headland hill */}
      <mesh position={[24, 3, -20]}>
        <sphereGeometry args={[14, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#365E3C" side={THREE.BackSide} />
      </mesh>

      {/* Pine trees — cone + trunk clusters */}
      {([
        [-18, -28], [-16, -30], [-14, -31],
        [18, -26],  [21, -28],  [23, -25],
        [0,  -32],  [3,  -33],  [-4, -32],
      ] as [number, number][]).map(([x, z], i) => (
        <group key={i} position={[x, 3.5 + (i % 3) * 0.8, z]}>
          {/* Trunk */}
          <mesh position={[0, -1.5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 1.8, 6]} />
            <meshLambertMaterial color="#5C3D1E" />
          </mesh>
          {/* Canopy */}
          <mesh>
            <coneGeometry args={[0.9, 2.4, 6]} />
            <meshLambertMaterial color="#2A5C32" />
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
      {/* Church body */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.5, 5, 3.5]} />
        <meshLambertMaterial color="#FAFAF8" />
      </mesh>
      {/* Facade gable */}
      <mesh position={[0, 4.5, 1.8]} rotation={[0, 0, 0]}>
        <coneGeometry args={[2.5, 1.8, 4]} />
        <meshLambertMaterial color="#E8E0D0" />
      </mesh>
      {/* Bell tower campanile */}
      <mesh position={[2.5, 5, 0]}>
        <boxGeometry args={[1.2, 10, 1.2]} />
        <meshLambertMaterial color="#FAFAF8" />
      </mesh>
      {/* Bell tower cap */}
      <mesh position={[2.5, 10.5, 0]}>
        <coneGeometry args={[1.0, 1.8, 4]} />
        <meshLambertMaterial color="#C84B31" />
      </mesh>
      {/* Dome */}
      <mesh position={[0, 4.8, 0]}>
        <sphereGeometry args={[1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#9E9E6E" />
      </mesh>
    </group>
  )
}

// ── Castello Brown (castle silhouette on left headland) ───────────────────────

function Castello() {
  return (
    <group position={[-19, 7, -26]}>
      {/* Main keep */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[4, 6, 4]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
      {/* Battlements — small boxes on top */}
      {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 5.5, 1.8]}>
          <boxGeometry args={[0.6, 0.8, 0.4]} />
          <meshLambertMaterial color="#8B7355" />
        </mesh>
      ))}
      {/* Tower */}
      <mesh position={[2.5, 4, 0]}>
        <cylinderGeometry args={[0.8, 1.0, 8, 8]} />
        <meshLambertMaterial color="#78634A" />
      </mesh>
      {/* Tower conical roof */}
      <mesh position={[2.5, 8.5, 0]}>
        <coneGeometry args={[0.9, 1.5, 8]} />
        <meshLambertMaterial color="#5A4A30" />
      </mesh>
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

    // iPhone screen glow pulses softly
    if (iphoneGlowRef.current) {
      iphoneGlowRef.current.emissiveIntensity =
        0.18 + Math.sin(t * 1.2) * 0.06 + smoothProgress.current * 0.15
    }
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

      {/* ── iPhone as mainsail ───────────────────────────────────────────── */}
      <group position={[0, 4.8, 0.4]} rotation={[0.15, 0, 0.04]}>
        {/* Phone body — titanium/space black */}
        <mesh>
          <boxGeometry args={[2.10, 4.55, 0.14]} />
          <meshStandardMaterial
            color="#1C1C1E"
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>

        {/* Screen surface — glowing tiffany/champagne */}
        <mesh position={[0, 0, 0.075]}>
          <planeGeometry args={[1.88, 4.10]} />
          <meshStandardMaterial
            ref={iphoneGlowRef}
            color="#0A1A2A"
            emissive="#14B8A6"
            emissiveIntensity={0.22}
            roughness={0.05}
            metalness={0.0}
          />
        </mesh>

        {/* Screen content hint — gold UI lines (purely visual) */}
        {[1.2, 0.4, -0.4, -1.2].map((y, i) => (
          <mesh key={i} position={[0.1, y, 0.077]}>
            <planeGeometry args={[i === 0 ? 1.2 : 0.8 + Math.random() * 0.5, 0.045]} />
            <meshStandardMaterial
              color="#C49A3C"
              emissive="#C49A3C"
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}

        {/* Dynamic Island */}
        <mesh position={[0, 1.95, 0.078]}>
          <capsuleGeometry args={[0.09, 0.28, 8, 16]} />
          <meshStandardMaterial color="#050505" />
        </mesh>

        {/* Subtle screen edge glow */}
        <mesh position={[0, 0, 0.076]}>
          <planeGeometry args={[1.90, 4.12]} />
          <meshStandardMaterial
            color="#14B8A6"
            emissive="#14B8A6"
            emissiveIntensity={0.05}
            transparent
            opacity={0.12}
          />
        </mesh>
      </group>

      {/* ── Wake (foam trail behind boat) ────────────────────────────────── */}
      <mesh position={[0, -0.78, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 6, 1, 1]} />
        <meshStandardMaterial
          color="#FFFFFF"
          transparent
          opacity={0.18}
          roughness={1}
        />
      </mesh>
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
      <ambientLight intensity={0.55} color="#C8D4E8" />
      <directionalLight ref={dirRef} position={[8, 14, 6]} intensity={1.4} color="#FFFFFF" />
      {/* Subtle blue-sky fill from above */}
      <hemisphereLight
        args={['#87CEEB', '#3A6B40', 0.35]}
      />
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

  return (
    <Sky
      distance={4500}
      sunPosition={[
        Math.cos(0.25 * Math.PI * 2) * Math.cos(0.485 * Math.PI),
        Math.sin(0.485 * Math.PI),
        Math.sin(0.25 * Math.PI * 2) * Math.cos(0.485 * Math.PI),
      ]}
      inclination={0.485}
      azimuth={0.25}
      turbidity={6}
      rayleigh={1.8}
      mieCoefficient={0.006}
      mieDirectionalG={0.82}
    />
  )
}

// ── Scene fog ─────────────────────────────────────────────────────────────────

function SceneFog() {
  return <fog attach="fog" args={['#C8D8EE', 28, 65]} />
}

// ── Inner scene (used inside Canvas) ─────────────────────────────────────────

function PortofinoInner() {
  return (
    <>
      <SceneFog />
      <SceneLighting />
      <SceneSky />
      <WaterSurface />
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
            camera={{ position: [0, 5, 22], fov: 55, near: 0.1, far: 200 }}
            style={{ position: 'fixed', inset: 0, zIndex: 0 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 1.5]}
          >
            <PortofinoInner />
          </Canvas>
        )
      }
      return { default: PortofinoCanvas }
    }),
  { ssr: false },
)
