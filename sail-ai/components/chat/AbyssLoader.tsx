'use client'

/**
 * AbyssLoader — Ultra-Premium 3D Cyber-Fisher Loading Panel
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout contract (solves all overflow/mobile issues):
 *
 *   ┌─ wrapper (position:relative, h:320px) ── participates in DOM flow ──┐
 *   │  ┌─ Canvas (position:absolute, inset:0) ── background layer ────────┐│
 *   │  │   3D scene renders here, behind everything                       ││
 *   │  └────────────────────────────────────────────────────────────────────┘│
 *   │  ┌─ status overlay  (position:absolute, z:10) ────────────────────── ┐│
 *   │  └──────────────────────────────────────────────────────────────────── ┘│
 *   │  ┌─ reveal overlay  (position:absolute, z:10) ────────────────────── ┐│
 *   │  └──────────────────────────────────────────────────────────────────── ┘│
 *   └────────────────────────────────────────────────────────────────────────┘
 *
 * Key improvements over v1:
 *   • Canvas is position:absolute → never pushes DOM siblings, no overflow
 *   • dpr={[1,2]}  → Retina-sharp on HiDPI screens, mobile-safe
 *   • CameraRig    → useThree monitors container size, adjusts FOV in real time
 *   • SceneObjects → scale adapts to narrow viewports (no clipping on mobile)
 *   • Glassmorphism v2: blur(16px), rgba channels tuned, razor-thin borders
 *   • Typography: SF Pro / Inter stack, optical letter-spacing
 *   • All transitions: cubic-bezier(0.22, 1, 0.36, 1) — Apple easing
 *   • State machine: IDLE → CASTING → GLITCH → REVEAL (external-prop driven)
 */

import { useRef, useState, useEffect }  from 'react'
import type { PerspectiveCamera }        from 'three'
import { Vector2 }                       from 'three'
import { Canvas, useThree }              from '@react-three/fiber'
import { Float, Environment }            from '@react-three/drei'
import { EffectComposer, Bloom, Glitch } from '@react-three/postprocessing'
import gsap                              from 'gsap'

// ── State machine ─────────────────────────────────────────────────────────────

const S = {
  IDLE:    'IDLE',
  CASTING: 'CASTING',
  GLITCH:  'GLITCH',
  REVEAL:  'REVEAL',
} as const

type AppState = typeof S[keyof typeof S]

// ── Adaptive camera ───────────────────────────────────────────────────────────
//  Lives inside Canvas so it has access to useThree()

function CameraRig() {
  const { camera, size } = useThree()

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    if (!('fov' in cam)) return
    // Wider FOV on narrow containers keeps all objects visible without clipping
    cam.fov = size.width < 400 ? 82
            : size.width < 640 ? 70
            : 60
    cam.updateProjectionMatrix()
  }, [camera, size.width])

  return null
}

// ── Cyber Fisher ──────────────────────────────────────────────────────────────

function CyberFisher({
  appState, setAppState,
}: {
  appState: AppState
  setAppState: (s: AppState) => void
}) {
  const fishermanRef = useRef<import('three').Group>(null)
  const rodRef       = useRef<import('three').Mesh>(null)
  const { size }     = useThree()

  // Scale objects down on mobile so they never clip the canvas edge
  const s = size.width < 400 ? 0.68 : size.width < 640 ? 0.84 : 1.0
  const px = 2 * s          // x-position scales with object
  const py = -1 * s         // y-position

  useEffect(() => {
    if (!fishermanRef.current || !rodRef.current) return
    if (appState === S.CASTING) {
      const tl = gsap.timeline()
      tl.to(fishermanRef.current.rotation, {
          y: Math.PI / 4, duration: 0.8, ease: 'power2.out',
        })
        .to(rodRef.current.scale, {
          y: 8, duration: 1.5, ease: 'elastic.out(1, 0.5)',
        })
        .call(() => setAppState(S.GLITCH))
    } else if (appState === S.IDLE) {
      gsap.to(fishermanRef.current.rotation, { y: 0, duration: 1 })
      gsap.to(rodRef.current.scale,          { y: 1, duration: 1 })
    }
  }, [appState, setAppState])

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={fishermanRef} position={[px, py, 0]} scale={s}>
        {/* Body — neon wireframe capsule */}
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 1, 4, 8]} />
          <meshPhysicalMaterial
            color="#00ffcc"
            wireframe
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Rod */}
        <mesh ref={rodRef} position={[-0.5, 1, 0]} scale={[1, 1, 1]}>
          <cylinderGeometry args={[0.02, 0.02, 1]} />
          <meshBasicMaterial color="#ff00a0" />
        </mesh>
      </group>
    </Float>
  )
}

// ── Mode Card ─────────────────────────────────────────────────────────────────

function ModeCard({ appState }: { appState: AppState }) {
  const { size } = useThree()
  const s = size.width < 400 ? 0.55 : size.width < 640 ? 0.72 : 1.0

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh position={[-1 * s, -1.5 * s, -2]}>
        {appState === S.IDLE ? (
          <planeGeometry args={[1.2 * s, 1.8 * s]} />
        ) : (
          <sphereGeometry args={[0.8 * s, 32, 32]} />
        )}
        <meshPhysicalMaterial
          color="#0088ff"
          emissive="#001133"
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
    </Float>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AbyssLoaderProps {
  /** Mode name shown in the status label */
  modeLabel?:  string
  /** True while the AI is processing */
  isActive:    boolean
  /** True when the response has arrived */
  isComplete:  boolean
}

// ── Main component ────────────────────────────────────────────────────────────

export function AbyssLoader({
  modeLabel = 'Intelligence',
  isActive,
  isComplete,
}: AbyssLoaderProps) {
  const [appState, setAppState] = useState<AppState>(S.IDLE)

  // ── External prop → state machine ─────────────────────────────────────────
  useEffect(() => {
    if (isActive && appState === S.IDLE) setAppState(S.CASTING)
  }, [isActive, appState])

  useEffect(() => {
    if (!isActive && !isComplete) setAppState(S.IDLE)
  }, [isActive, isComplete])

  // ── Auto-advance GLITCH → REVEAL ──────────────────────────────────────────
  useEffect(() => {
    if (appState !== S.GLITCH) return
    const t = setTimeout(() => setAppState(S.REVEAL), 2500)
    return () => clearTimeout(t)
  }, [appState])

  // ── Derived display values ─────────────────────────────────────────────────
  const isReveal  = appState === S.REVEAL
  const dotColor  = isReveal ? '#00ffcc' : '#ff00a0'
  const labelColor = isReveal ? '#00ffcc' : 'rgba(0,255,204,0.55)'

  const statusText =
    appState === S.IDLE    ? `${modeLabel} · Standby`                  :
    appState === S.CASTING ? `${modeLabel} · Casting…`                  :
    appState === S.GLITCH  ? `${modeLabel} · Intercepting data stream`  :
                             `${modeLabel} · Intelligence compiled`

  return (
    /*
     * ── Wrapper ──────────────────────────────────────────────────────────────
     * position:relative  → establishes stacking context for children
     * height:320px       → explicit height so DOM flow is predictable
     * overflow:hidden    → clips 3D canvas & rounded corners
     * Canvas, overlays   → all position:absolute inside here
     */
    <div style={{
      position:     'relative',
      width:        '100%',
      height:        320,
      borderRadius:  16,
      overflow:     'hidden',
      background:   'rgba(2, 2, 6, 0.95)',
      border:       '1px solid rgba(0,255,204,0.12)',
      boxShadow:    [
        '0 0 0 1px rgba(0,255,204,0.06)',
        '0 8px 40px rgba(0,255,204,0.07)',
        '0 2px 12px rgba(0,0,0,0.50)',
      ].join(', '),
    }}>

      {/* ────────────────────────────────────────────────────────────────────
          3-D Canvas — background layer
          position:absolute + inset:0 → fills wrapper, zero DOM flow impact
          dpr=[1,2]                   → Retina-sharp, no mobile jank
          ──────────────────────────────────────────────────────────────── */}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 2]}
        style={{
          position: 'absolute',
          inset:     0,
          width:    '100%',
          height:   '100%',
        }}
      >
        {/* Adaptive camera — adjusts FOV on resize */}
        <CameraRig />

        <Environment preset="night" />
        <ambientLight intensity={0.45} />
        <spotLight
          position={[5, 10, 5]}
          angle={0.3}
          penumbra={1}
          color="#00ffcc"
          intensity={2.2}
          castShadow
        />

        <CyberFisher appState={appState} setAppState={setAppState} />
        <ModeCard    appState={appState} />

        {/* Glitch strength=Vector2(0,0) = invisible when not in GLITCH state */}
        <EffectComposer enableNormalPass={false}>
          <Bloom
            luminanceThreshold={0.18}
            mipmapBlur
            intensity={1.6}
          />
          <Glitch
            delay={new Vector2(0, 0)}
            duration={new Vector2(0.1, 0.3)}
            strength={
              appState === S.GLITCH
                ? new Vector2(0.4, 0.8)
                : new Vector2(0, 0)
            }
          />
        </EffectComposer>
      </Canvas>

      {/* ────────────────────────────────────────────────────────────────────
          Status label overlay
          position:absolute, z:10 → floats above Canvas, pointer-events:none
          ──────────────────────────────────────────────────────────────── */}
      <div style={{
        position:      'absolute',
        top:            14,
        left:           16,
        right:          16,
        zIndex:         10,
        display:       'flex',
        alignItems:    'center',
        gap:            8,
        pointerEvents: 'none',
      }}>
        {/* Pulsing activity dot */}
        <span style={{
          display:      'inline-block',
          width:         6,
          height:        6,
          borderRadius: '50%',
          background:   dotColor,
          flexShrink:   0,
          animation:    'abyss-pulse 1.1s ease-in-out infinite',
          boxShadow:    `0 0 10px ${dotColor}90`,
          transition:   'background 0.4s cubic-bezier(0.22,1,0.36,1)',
        }} />

        {/* Mode + phase text */}
        <span style={{
          fontFamily:    [
            '-apple-system', 'BlinkMacSystemFont',
            '"SF Pro Text"', '"Inter"',
            '"JetBrains Mono"', 'monospace',
          ].join(', '),
          fontSize:       10,
          fontWeight:     600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:          labelColor,
          transition:    'color 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}>
          {statusText}
        </span>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          Reveal overlay — mounts on REVEAL, animates in
          position:absolute, z:10 → stays above Canvas at all times
          ──────────────────────────────────────────────────────────────── */}
      {appState === S.REVEAL && (
        <div style={{
          position:       'absolute',
          bottom:          16,
          left:            16,
          right:           16,
          zIndex:          10,
          background:     'rgba(0,255,204,0.04)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border:         '1px solid rgba(0,255,204,0.14)',
          borderRadius:    12,
          padding:        '14px 18px',
          animation:      'abyss-reveal 0.7s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <p style={{
            margin:        0,
            fontFamily:   '"SF Mono", "JetBrains Mono", "Fira Code", monospace',
            fontSize:      10,
            color:         'rgba(0,255,204,0.38)',
            letterSpacing: '0.08em',
          }}>
            // Hook Connected
          </p>
          <p style={{
            margin:        '6px 0 0',
            fontFamily:   '"SF Mono", "JetBrains Mono", "Fira Code", monospace',
            fontSize:      12,
            color:         '#00ffcc',
            fontWeight:    600,
            letterSpacing: '0.02em',
            lineHeight:    1.5,
          }}>
            $ {modeLabel} algorithm compiled successfully.
          </p>
        </div>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes abyss-pulse {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.2; transform: scale(0.52); }
        }
        @keyframes abyss-reveal {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  )
}
