'use client'

/**
 * AbyssLoader — 3D Cyber-Fisher Loading Animation
 * ─────────────────────────────────────────────────────────────────────────────
 * Adapted from AbyssOS for integration into the Sail AI chat panel.
 *
 * State machine (driven by external props):
 *   IDLE     → isActive=false, isComplete=false  → fisherman at rest
 *   CASTING  → isActive=true                     → rod extends, line casts
 *   GLITCH   → internal (auto after CASTING)      → glitch FX 2.5s
 *   REVEAL   → isComplete=true                   → response overlay fades in
 *
 * Renders in a fixed-height panel (360px) — not full-screen.
 * Transparent background lets the mint gradient show through.
 */

import { useRef, useState, useEffect } from 'react'
import { Vector2 }                      from 'three'
import { Canvas }                      from '@react-three/fiber'
import { Float, Environment }          from '@react-three/drei'
import { EffectComposer, Bloom, Glitch } from '@react-three/postprocessing'
import { GlitchMode }                  from 'postprocessing'
import gsap                            from 'gsap'

// ── State machine ─────────────────────────────────────────────────────────────

const S = {
  IDLE:    'IDLE',
  CASTING: 'CASTING',
  GLITCH:  'GLITCH',
  REVEAL:  'REVEAL',
} as const

type AppState = typeof S[keyof typeof S]

// ── Cyber Fisher ──────────────────────────────────────────────────────────────

function CyberFisher({
  appState,
  setAppState,
}: {
  appState:    AppState
  setAppState: (s: AppState) => void
}) {
  const fishermanRef = useRef<import('three').Group>(null)
  const rodRef       = useRef<import('three').Mesh>(null)

  useEffect(() => {
    if (!fishermanRef.current || !rodRef.current) return

    if (appState === S.CASTING) {
      const tl = gsap.timeline()
      tl.to(fishermanRef.current.rotation, { y: Math.PI / 4, duration: 0.8, ease: 'power2.out' })
        .to(rodRef.current.scale, { y: 8, duration: 1.5, ease: 'elastic.out(1, 0.5)' })
        .call(() => setAppState(S.GLITCH))
    } else if (appState === S.IDLE) {
      gsap.to(fishermanRef.current.rotation, { y: 0, duration: 1 })
      gsap.to(rodRef.current.scale, { y: 1, duration: 1 })
    }
  }, [appState, setAppState])

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={fishermanRef} position={[2, -1, 0]}>
        {/* Body */}
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 1, 4, 8]} />
          <meshPhysicalMaterial color="#00ffcc" wireframe roughness={0.2} metalness={0.8} />
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

// ── Mode Card (morphs on hook hit) ────────────────────────────────────────────

function ModeCard({ appState }: { appState: AppState }) {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh position={[-1, -1.5, -2]}>
        {appState === S.IDLE ? (
          <planeGeometry args={[1.2, 1.8]} />
        ) : (
          <sphereGeometry args={[0.8, 32, 32]} />
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
  /** The mode currently active — used in the reveal label */
  modeLabel?: string
  /** True while the AI is processing */
  isActive:   boolean
  /** True when the response has arrived */
  isComplete: boolean
}

// ── Main component ────────────────────────────────────────────────────────────

export function AbyssLoader({ modeLabel = 'Intelligence', isActive, isComplete }: AbyssLoaderProps) {
  const [appState, setAppState] = useState<AppState>(S.IDLE)

  // Drive internal state machine from external props
  useEffect(() => {
    if (isActive && appState === S.IDLE) {
      setAppState(S.CASTING)
    }
  }, [isActive, appState])

  useEffect(() => {
    if (!isActive && !isComplete) {
      setAppState(S.IDLE)
    }
  }, [isActive, isComplete])

  // Auto-advance GLITCH → REVEAL when analysis completes
  useEffect(() => {
    if (appState !== S.GLITCH) return
    const t = setTimeout(() => {
      setAppState(S.REVEAL)
    }, 2500)
    return () => clearTimeout(t)
  }, [appState])

  return (
    <div style={{
      position:   'relative',
      width:      '100%',
      height:      320,
      borderRadius: 12,
      overflow:   'hidden',
      background: 'rgba(1,1,4,0.92)',
      border:     '1px solid rgba(0,255,204,0.18)',
      boxShadow:  '0 4px 32px rgba(0,255,204,0.08)',
    }}>

      {/* ── 3D Canvas ── */}
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }} style={{ width: '100%', height: '100%' }}>
        <Environment preset="night" />
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} color="#00ffcc" intensity={2} />

        <CyberFisher appState={appState} setAppState={setAppState} />
        <ModeCard appState={appState} />

        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Glitch
            delay={new Vector2(0, 0)}
            duration={new Vector2(0.1, 0.3)}
            strength={appState === S.GLITCH ? new Vector2(0.4, 0.8) : new Vector2(0, 0)}
            mode={GlitchMode.CONSTANT_WILD}
            active={appState === S.GLITCH}
          />
        </EffectComposer>
      </Canvas>

      {/* ── Status label overlay ── */}
      <div style={{
        position:   'absolute',
        top:         14,
        left:        16,
        right:       16,
        display:    'flex',
        alignItems: 'center',
        gap:         8,
        pointerEvents: 'none',
      }}>
        {/* Pulsing dot */}
        <span style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   appState === S.REVEAL ? '#00ffcc' : '#ff00a0',
          display:      'inline-block',
          animation:    'abyss-pulse 1.1s ease-in-out infinite',
          flexShrink:   0,
        }} />
        <span style={{
          fontFamily:    '"JetBrains Mono", "Fira Code", monospace',
          fontSize:       10,
          fontWeight:     600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:          appState === S.REVEAL ? '#00ffcc' : 'rgba(0,255,204,0.55)',
        }}>
          {appState === S.IDLE    && `${modeLabel} · Standby`}
          {appState === S.CASTING && `${modeLabel} · Casting…`}
          {appState === S.GLITCH  && `${modeLabel} · Intercepting data stream`}
          {appState === S.REVEAL  && `${modeLabel} · Intelligence compiled`}
        </span>
      </div>

      {/* ── Reveal overlay ── */}
      {appState === S.REVEAL && (
        <div style={{
          position:       'absolute',
          bottom:          16,
          left:            16,
          right:           16,
          background:     'rgba(0,255,204,0.06)',
          backdropFilter: 'blur(12px)',
          border:         '1px solid rgba(0,255,204,0.22)',
          borderRadius:    10,
          padding:        '14px 18px',
          animation:      'abyss-fade 0.8s ease-out',
        }}>
          <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 11, color: 'rgba(0,255,204,0.55)', letterSpacing: '0.06em' }}>
            // Abyss OS — Hook Connected
          </p>
          <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 12, color: '#00ffcc', fontWeight: 600 }}>
            $ {modeLabel} algorithm compiled successfully.
          </p>
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes abyss-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
        @keyframes abyss-fade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
