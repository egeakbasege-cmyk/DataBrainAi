/**
 * components/landing/PortofinoScene.tsx — Blended Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Classic Portofino narrative structure (sailboat · iPhone sail · harbour ·
 * church · castello · pier) with the best-looking VR improvements grafted in:
 *
 *   Water   — Gerstner waves (analytically derived normals, no artifacts)
 *   Post-FX — Subtle Bloom only (no GodRays, no heavy pipeline)
 *   Camera  — Gentle continuous bob (CameraRig)
 *   Birds   — 2 seagulls, simple sinusoidal wing flap
 *
 * Narrative: boat advances along CatmullRomCurve3 as user interacts with app.
 * Dynamically imported (ssr: false) — pure client.
 */
'use client'

import dynamic                                from 'next/dynamic'
import { useRef, useMemo, useEffect }         from 'react'
import { useFrame, useThree }                 from '@react-three/fiber'
import { Sky }                                from '@react-three/drei'
import * as THREE                             from 'three'
import { useNarrative, NODE_ORDER }           from './narrativeStore'

// ── GLSL: Gerstner water ──────────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
precision highp float;

uniform float uTime;

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;
varying vec3  vNormal;

struct GWave { vec2 dir; float amp; float freq; float speed; float steep; };

vec3 gerstner(GWave w, vec2 xz, float t, inout vec3 tangent, inout vec3 bitangent) {
  float phi  = w.freq * dot(w.dir, xz) + w.speed * t;
  float c    = cos(phi);
  float s    = sin(phi);
  float qa   = w.steep * w.amp;
  tangent   += vec3(
    -w.dir.x * w.dir.x * (w.steep * s),
     w.dir.x * w.amp   *  c,
    -w.dir.x * w.dir.y * (w.steep * s)
  );
  bitangent += vec3(
    -w.dir.x * w.dir.y * (w.steep * s),
     w.dir.y * w.amp   *  c,
    -w.dir.y * w.dir.y * (w.steep * s)
  );
  return vec3(
    qa * w.dir.x * c,
    w.amp * s,
    qa * w.dir.y * c
  );
}

void main() {
  vUv = uv;
  vec3 pos = position;

  GWave w0 = GWave(normalize(vec2(1.0, 0.6)),  0.14, 0.45, 1.10, 0.42);
  GWave w1 = GWave(normalize(vec2(-0.4, 1.0)), 0.08, 0.80, 1.40, 0.35);
  GWave w2 = GWave(normalize(vec2(0.7, -0.3)), 0.05, 1.20, 0.90, 0.28);
  GWave w3 = GWave(normalize(vec2(0.2, 0.9)),  0.03, 1.80, 1.60, 0.20);

  vec3 tangent   = vec3(1.0, 0.0, 0.0);
  vec3 bitangent = vec3(0.0, 0.0, 1.0);

  vec3 disp = gerstner(w0, pos.xz, uTime, tangent, bitangent)
            + gerstner(w1, pos.xz, uTime, tangent, bitangent)
            + gerstner(w2, pos.xz, uTime, tangent, bitangent)
            + gerstner(w3, pos.xz, uTime, tangent, bitangent);

  pos += disp;
  vElevation = disp.y;
  vNormal    = normalize(cross(bitangent, tangent));

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos  = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const WATER_FRAG = /* glsl */`
precision highp float;

uniform vec3  uDeepColor;
uniform vec3  uSurfaceColor;
uniform vec3  uSunPos;
uniform float uProgress;

varying vec2  vUv;
varying float vElevation;
varying vec3  vWorldPos;
varying vec3  vNormal;

void main() {
  vec3 norm = normalize(vNormal);

  // Base colour
  float t     = clamp((vElevation + 0.22) * 2.2, 0.0, 1.0);
  vec3 water  = mix(uDeepColor, uSurfaceColor, t);

  // Golden-hour tint grows with progress
  water = mix(water, water * vec3(1.18, 0.96, 0.72), uProgress * 0.55);

  // Champagne-gold sun specular
  vec3 viewDir = normalize(vec3(0.0, 1.0, 0.45));
  vec3 halfVec = normalize(uSunPos + viewDir);
  float spec   = pow(max(dot(norm, halfVec), 0.0), 110.0);
  water       += vec3(0.769, 0.604, 0.235) * spec * mix(0.45, 1.20, uProgress);

  // Foam at crests
  float foam = smoothstep(0.28, 0.44, vElevation);
  water = mix(water, vec3(0.96, 0.98, 1.0), foam * 0.22);

  // Horizon fade
  float horizon = smoothstep(0.20, 0.60, vUv.y);
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
    uProgress:     { value: 0.0 },
    uDeepColor:    { value: new THREE.Color('#061428') },
    uSurfaceColor: { value: new THREE.Color('#14B8A6') },
    uSunPos:       { value: new THREE.Vector3(1.0, 0.5, -0.3) },
  }), [])

  useEffect(() => {
    progressRef.current = NODE_ORDER.indexOf(node) / (NODE_ORDER.length - 1)
  }, [node])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime() * 0.55
    const target = progressRef.current
    uniforms.uProgress.value += (target - uniforms.uProgress.value) * 0.006
    const pp = uniforms.uProgress.value
    uniforms.uSunPos.value.set(1.0 - pp * 0.45, 0.60 - pp * 0.30, -0.30 + pp * 0.10).normalize()
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
      <planeGeometry args={[90, 70, 100, 100]} />
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

interface BuildingCfg { x: number; z: number; w: number; h: number; d: number; color: string; rowY?: number }

const BUILDINGS: BuildingCfg[] = [
  // Front waterfront row
  { x: -13, z: -20, w: 3.6, h: 9,  d: 3.0, color: '#C84B31' },
  { x:  -9, z: -21, w: 4.2, h: 14, d: 3.0, color: '#F0D090' },
  { x:  -5, z: -21, w: 3.2, h: 11, d: 3.0, color: '#E8845C' },
  { x:  -1, z: -22, w: 4.6, h: 16, d: 3.0, color: '#E6B870' },
  { x:   4, z: -22, w: 3.8, h: 12, d: 3.0, color: '#FAFAF8' },
  { x:   8, z: -21, w: 4.0, h: 13, d: 3.0, color: '#C84B31' },
  { x:  12, z: -20, w: 3.4, h: 10, d: 3.0, color: '#E8845C' },
  { x:  16, z: -19, w: 4.0, h: 9,  d: 3.0, color: '#F0D090' },
  { x:  20, z: -18, w: 3.6, h: 8,  d: 3.0, color: '#D4956A' },
  // Second row (elevated)
  { x: -11, z: -26, w: 3.0, h: 7,  d: 3.0, color: '#FAFAF8', rowY: 1.5 },
  { x:  -7, z: -27, w: 3.5, h: 9,  d: 3.0, color: '#E6B870', rowY: 2.0 },
  { x:  -3, z: -28, w: 3.0, h: 8,  d: 3.0, color: '#C84B31', rowY: 2.5 },
  { x:   1, z: -28, w: 4.0, h: 10, d: 3.0, color: '#E8845C', rowY: 2.5 },
  { x:   5, z: -28, w: 3.0, h: 8,  d: 3.0, color: '#F0D090', rowY: 2.5 },
  { x:   9, z: -27, w: 3.5, h: 9,  d: 3.0, color: '#D4956A', rowY: 2.0 },
  { x:  13, z: -26, w: 3.0, h: 7,  d: 3.0, color: '#FAFAF8', rowY: 1.5 },
  // Far-left wing
  { x: -17, z: -18, w: 3.5, h: 10, d: 3.0, color: '#E8845C' },
  { x: -20, z: -16, w: 3.0, h: 8,  d: 3.0, color: '#F0D090' },
]

function HarborBuildings() {
  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <mesh key={i} position={[b.x, (b.rowY ?? 0) + b.h / 2 - 1.0, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshLambertMaterial color={b.color} />
        </mesh>
      ))}
      {/* Green shutters */}
      {[[-1, 7, -22], [4, 5.5, -22], [-5, 4.5, -21]].map(([x, y, z], i) => (
        <mesh key={`sh-${i}`} position={[x as number, y as number, (z as number) + 1.55]}>
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
      <mesh position={[0, 4, -35]}>
        <sphereGeometry args={[22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#3A6B40" side={THREE.BackSide} />
      </mesh>
      <mesh position={[-22, 3, -22]}>
        <sphereGeometry args={[12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#2D5A35" side={THREE.BackSide} />
      </mesh>
      <mesh position={[24, 3, -20]}>
        <sphereGeometry args={[14, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#365E3C" side={THREE.BackSide} />
      </mesh>
      {/* Pine trees */}
      {([
        [-18, -28], [-16, -30], [-14, -31],
        [18, -26],  [21, -28],  [23, -25],
        [0,  -32],  [3,  -33],  [-4, -32],
      ] as [number, number][]).map(([x, z], i) => (
        <group key={i} position={[x, 3.5 + (i % 3) * 0.8, z]}>
          <mesh position={[0, -1.5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 1.8, 6]} />
            <meshLambertMaterial color="#5C3D1E" />
          </mesh>
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
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.5, 5, 3.5]} />
        <meshLambertMaterial color="#FAFAF8" />
      </mesh>
      <mesh position={[0, 4.5, 1.8]}>
        <coneGeometry args={[2.5, 1.8, 4]} />
        <meshLambertMaterial color="#E8E0D0" />
      </mesh>
      <mesh position={[2.5, 5, 0]}>
        <boxGeometry args={[1.2, 10, 1.2]} />
        <meshLambertMaterial color="#FAFAF8" />
      </mesh>
      <mesh position={[2.5, 10.5, 0]}>
        <coneGeometry args={[1.0, 1.8, 4]} />
        <meshLambertMaterial color="#C84B31" />
      </mesh>
      <mesh position={[0, 4.8, 0]}>
        <sphereGeometry args={[1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#9E9E6E" />
      </mesh>
    </group>
  )
}

// ── Castello Brown ───────────────────────────────────────────────────────────

function Castello() {
  return (
    <group position={[-19, 7, -26]}>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[4, 6, 4]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
      {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 5.5, 1.8]}>
          <boxGeometry args={[0.6, 0.8, 0.4]} />
          <meshLambertMaterial color="#8B7355" />
        </mesh>
      ))}
      <mesh position={[2.5, 4, 0]}>
        <cylinderGeometry args={[0.8, 1.0, 8, 8]} />
        <meshLambertMaterial color="#78634A" />
      </mesh>
      <mesh position={[2.5, 8.5, 0]}>
        <coneGeometry args={[0.9, 1.5, 8]} />
        <meshLambertMaterial color="#5A4A30" />
      </mesh>
    </group>
  )
}

// ── Pier ─────────────────────────────────────────────────────────────────────

function Pier() {
  return (
    <group position={[-11, -0.6, -6]}>
      <mesh>
        <boxGeometry args={[3.5, 0.25, 14]} />
        <meshLambertMaterial color="#8B6E4E" />
      </mesh>
      {[-5, -1, 3].map((z, i) => (
        <mesh key={i} position={[1.5, 0.4, z]}>
          <cylinderGeometry args={[0.18, 0.22, 0.9, 6]} />
          <meshLambertMaterial color="#555550" />
        </mesh>
      ))}
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

const HARBOR_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(18,  0.0, -6),
  new THREE.Vector3(12,  0.0, -3),
  new THREE.Vector3( 6,  0.0,  0),
  new THREE.Vector3( 0,  0.0,  2),
  new THREE.Vector3(-5,  0.0,  4),
  new THREE.Vector3(-8,  0.0,  5),
])

function RiggingLines() {
  const LINES = useMemo(() => {
    const pts = (s: THREE.Vector3, e: THREE.Vector3) =>
      new THREE.BufferGeometry().setFromPoints([s, e])
    return [
      pts(new THREE.Vector3(0, 9, 0.8), new THREE.Vector3(0, 0.3, -4.2)),
      pts(new THREE.Vector3(0, 7.5, 0.8), new THREE.Vector3(-1.2, 0.3, 1.0)),
      pts(new THREE.Vector3(0, 7.5, 0.8), new THREE.Vector3( 1.2, 0.3, 1.0)),
      pts(new THREE.Vector3(0, 9, 0.8), new THREE.Vector3(0, 0.3, 4.2)),
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

function JibSail() {
  const geo = useMemo(() => {
    const v = new Float32Array([
      0, 0.3, -3.8,
      0, 9.0,  0.8,
      0, 1.2,  0.8,
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(v, 3))
    g.setIndex([0, 1, 2])
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#F5F0E8" side={THREE.DoubleSide} roughness={0.6} transparent opacity={0.88} />
    </mesh>
  )
}

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
    boatRef.current.rotation.x = Math.sin(t * 0.38) * 0.025
    boatRef.current.rotation.z = Math.sin(t * 0.29 + 1.3) * 0.018
    if (iphoneGlowRef.current) {
      iphoneGlowRef.current.emissiveIntensity =
        0.18 + Math.sin(t * 1.2) * 0.06 + smoothProgress.current * 0.15
    }
  })

  return (
    <group ref={boatRef} position={[18, 0, -6]}>
      {/* Hull */}
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[2.6, 0.72, 9.0]} />
        <meshStandardMaterial color="#1E3A5F" metalness={0.15} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[2.4, 0.10, 8.6]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[2.62, 0.08, 9.04]} />
        <meshStandardMaterial color="#C49A3C" metalness={0.2} roughness={0.4} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.70, 1.2]}>
        <boxGeometry args={[1.8, 0.75, 3.2]} />
        <meshStandardMaterial color="#FAFAF8" roughness={0.5} />
      </mesh>
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 0.72, 1.2]}>
          <planeGeometry args={[0.4, 0.28]} />
          <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[0, -0.20, -4.6]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[2.0, 0.65, 0.8]} />
        <meshStandardMaterial color="#1E3A5F" />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 4.2, 0.8]}>
        <cylinderGeometry args={[0.07, 0.10, 9.5, 8]} />
        <meshStandardMaterial color="#8B7355" metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Boom */}
      <mesh position={[0, 1.1, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.055, 5.5, 6]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>
      <RiggingLines />
      <JibSail />
      {/* iPhone mainsail */}
      <group position={[0, 4.8, 0.4]} rotation={[0.15, 0, 0.04]}>
        <mesh>
          <boxGeometry args={[2.10, 4.55, 0.14]} />
          <meshStandardMaterial color="#1C1C1E" metalness={0.85} roughness={0.15} />
        </mesh>
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
        {[1.2, 0.4, -0.4, -1.2].map((y, i) => (
          <mesh key={i} position={[0.1, y, 0.077]}>
            <planeGeometry args={[i === 0 ? 1.2 : 0.7 + (i % 2) * 0.3, 0.045]} />
            <meshStandardMaterial color="#C49A3C" emissive="#C49A3C" emissiveIntensity={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 1.95, 0.078]}>
          <capsuleGeometry args={[0.09, 0.28, 8, 16]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
        <mesh position={[0, 0, 0.076]}>
          <planeGeometry args={[1.90, 4.12]} />
          <meshStandardMaterial color="#14B8A6" emissive="#14B8A6" emissiveIntensity={0.05} transparent opacity={0.12} />
        </mesh>
      </group>
      {/* Wake */}
      <mesh position={[0, -0.78, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 6, 1, 1]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.16} roughness={1} />
      </mesh>
    </group>
  )
}

// ── 2 Seagulls (simple, lightweight) ─────────────────────────────────────────

function Seagull({ offset, radius, height, speed }: {
  offset: number; radius: number; height: number; speed: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const lWingRef = useRef<THREE.Mesh>(null)
  const rWingRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const a = t * speed + offset
    if (groupRef.current) {
      groupRef.current.position.set(Math.cos(a) * radius, height + Math.sin(t * 1.1 + offset) * 0.4, Math.sin(a) * radius * 0.5 - 8)
      groupRef.current.rotation.y = -a + Math.PI
    }
    const flap = Math.sin(t * 3.2 + offset) * 0.55
    if (lWingRef.current) lWingRef.current.rotation.z =  flap
    if (rWingRef.current) rWingRef.current.rotation.z = -flap
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshLambertMaterial color="#F8F8F8" />
      </mesh>
      {/* Left wing */}
      <mesh ref={lWingRef} position={[-0.22, 0, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.42, 0.04, 0.16]} />
        <meshLambertMaterial color="#EEEEEE" />
      </mesh>
      {/* Right wing */}
      <mesh ref={rWingRef} position={[0.22, 0, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.42, 0.04, 0.16]} />
        <meshLambertMaterial color="#EEEEEE" />
      </mesh>
    </group>
  )
}

function Seagulls() {
  return (
    <group>
      <Seagull offset={0}    radius={9} height={7.5} speed={0.18} />
      <Seagull offset={2.6}  radius={6} height={9.0} speed={0.22} />
    </group>
  )
}

// ── Camera bob ────────────────────────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree()
  const base = useRef(new THREE.Vector3(0, 5, 22))
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = base.current.x + Math.sin(t * 0.20) * 0.08
    camera.position.y = base.current.y + Math.sin(t * 0.14) * 0.06
    camera.position.z = base.current.z + Math.sin(t * 0.10) * 0.10
    camera.lookAt(0, 1.0, 0)
  })
  return null
}

// ── Scene lighting ────────────────────────────────────────────────────────────

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
    const r = 1.0, g = 1.0 - p * 0.18, b = 0.9 - p * 0.35
    dirRef.current.color.setRGB(r, g, b)
    dirRef.current.intensity = 1.4 + p * 0.8
  })

  return (
    <>
      <ambientLight intensity={0.55} color="#C8D4E8" />
      <directionalLight ref={dirRef} position={[8, 14, 6]} intensity={1.4} color="#FFFFFF" />
      <hemisphereLight args={['#87CEEB', '#3A6B40', 0.35]} />
    </>
  )
}

// ── Sky ───────────────────────────────────────────────────────────────────────

function SceneSky() {
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

// ── Inner scene ───────────────────────────────────────────────────────────────

function PortofinoInner() {
  return (
    <>
      <fog attach="fog" args={['#C8D8EE', 28, 65]} />
      <SceneLighting />
      <SceneSky />
      <WaterSurface />
      <HarborBuildings />
      <HillTerrain />
      <Church />
      <Castello />
      <Pier />
      <SailboatWithPhone />
      <Seagulls />
      <CameraRig />
    </>
  )
}

// ── Dynamic Canvas export (no SSR) ───────────────────────────────────────────

export const PortofinoScene = dynamic(
  () =>
    import('@react-three/fiber').then(({ Canvas }) => {
      // Lazy-load Bloom separately to keep bundle clean
      const PostFX = dynamic(
        () =>
          import('@react-three/postprocessing').then(({ EffectComposer, Bloom }) => {
            function BloomPass() {
              return (
                <EffectComposer multisampling={0}>
                  <Bloom
                    intensity={0.55}
                    luminanceThreshold={0.75}
                    luminanceSmoothing={0.4}
                    mipmapBlur
                  />
                </EffectComposer>
              )
            }
            return { default: BloomPass }
          }),
        { ssr: false },
      )

      function PortofinoCanvas() {
        return (
          <Canvas
            camera={{ position: [0, 5, 22], fov: 55, near: 0.1, far: 200 }}
            style={{ position: 'fixed', inset: 0, zIndex: 0 }}
            gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
            dpr={[1, 1.5]}
          >
            <PortofinoInner />
            <PostFX />
          </Canvas>
        )
      }
      return { default: PortofinoCanvas }
    }),
  { ssr: false },
)
