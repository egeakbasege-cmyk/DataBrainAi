/**
 * components/landing/IPhoneFrame.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Photorealistic iPhone 15 Pro shell — pure CSS, zero images.
 *
 * Dimensions (scaled): 290 × 594px — exact 1:2.048 iPhone 15 Pro aspect ratio.
 * Features: Dynamic Island pill, titanium-gradient bezels, side buttons,
 * volume buttons, silent switch, front camera+sensors, screen inner radius.
 *
 * Glassmorphism: the bezel picks up the cinematic background via
 * backdrop-filter, creating the illusion the phone is part of the scene.
 */
'use client'

import { useRef }           from 'react'
import { motion }           from 'framer-motion'
import { useNarrative, SCENES } from './narrativeStore'

// ── Device geometry constants ──────────────────────────────────────────────────
const W  = 290   // frame outer width  (px)
const H  = 594   // frame outer height (px)
const BW = 11    // bezel width
const R  = 44    // outer corner radius

// ── Titanium frame gradient ────────────────────────────────────────────────────
// Simulates the brushed titanium finish of iPhone 15 Pro
const TITANIUM = `linear-gradient(
  165deg,
  #8A8A8E 0%,
  #6C6C70 8%,
  #9A9A9E 18%,
  #58585C 28%,
  #AEAEB2 35%,
  #6C6C70 45%,
  #9A9A9E 55%,
  #58585C 65%,
  #AEAEB2 75%,
  #6C6C70 85%,
  #8A8A8E 100%
)`

interface IPhoneFrameProps {
  children: React.ReactNode
}

export function IPhoneFrame({ children }: IPhoneFrameProps) {
  const { node }    = useNarrative()
  const scene       = SCENES[node]
  const frameRef    = useRef<HTMLDivElement>(null)

  const screenW = W  - BW * 2
  const screenH = H  - BW * 2

  return (
    <motion.div
      ref={frameRef}
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      style={{ width: W, height: H }}
      className="relative flex-shrink-0 select-none"
    >

      {/* ── Outer titanium bezel ──────────────────────────────────────────── */}
      <div
        style={{
          width: W, height: H,
          borderRadius: R,
          background: TITANIUM,
          boxShadow: [
            `0 0 0 1px rgba(255,255,255,0.12)`,
            `0 40px 80px rgba(0,0,0,0.75)`,
            `0 16px 32px rgba(0,0,0,0.55)`,
            `inset 0 1px 0 rgba(255,255,255,0.20)`,
            `inset 0 -1px 0 rgba(0,0,0,0.30)`,
            `0 0 40px ${scene.accentHex}22`,
          ].join(', '),
          transition: 'box-shadow 2.5s ease',
        }}
        className="absolute inset-0"
      />

      {/* ── Glass bevel — inner lip ───────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 1,
          borderRadius: R - 1,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.20) 100%)',
        }}
      />

      {/* ── Screen area ───────────────────────────────────────────────────── */}
      <div
        style={{
          position:     'absolute',
          top:          BW, left: BW,
          width:        screenW, height: screenH,
          borderRadius: R - BW,
          overflow:     'hidden',
          background:   '#000',
        }}
      >
        {/* App content */}
        {children}

        {/* Screen glare — top-left reflection */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '60%', height: '40%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
            borderTopLeftRadius: R - BW,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Dynamic Island ────────────────────────────────────────────────── */}
      <DynamicIsland accentHex={scene.accentHex} />

      {/* ── Side buttons — RIGHT: power ───────────────────────────────────── */}
      <SideButton side="right" top={140} height={72} label="power" />

      {/* ── Side buttons — LEFT: volume up, volume down, silent switch ────── */}
      <SideButton side="left" top={110} height={10} label="silent" />
      <SideButton side="left" top={140} height={42} label="vol-up" />
      <SideButton side="left" top={194} height={42} label="vol-dn" />

      {/* ── Home indicator bar ────────────────────────────────────────────── */}
      <div
        style={{
          position:     'absolute',
          bottom:       BW + 8,
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        100,
          height:       4,
          borderRadius: 4,
          background:   'rgba(255,255,255,0.28)',
        }}
      />
    </motion.div>
  )
}

// ── Dynamic Island ─────────────────────────────────────────────────────────────

function DynamicIsland({ accentHex }: { accentHex: string }) {
  return (
    <div
      style={{
        position:     'absolute',
        top:          11 + 12,     // BW + inner offset
        left:         '50%',
        transform:    'translateX(-50%)',
        width:        110,
        height:       33,
        borderRadius: 100,
        background:   '#000',
        boxShadow:    `0 0 0 1px rgba(255,255,255,0.06), 0 0 12px ${accentHex}30`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          10,
        transition:   'box-shadow 2s ease',
        zIndex:       10,
      }}
    >
      {/* Front camera dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: 'radial-gradient(circle, #1A1A2E 40%, #0A0A18 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 0 6px ${accentHex}40`,
      }} />
      {/* FaceID sensor array */}
      <div style={{
        width: 4, height: 4, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />
      <div style={{
        width: 4, height: 4, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />
    </div>
  )
}

// ── Side button ────────────────────────────────────────────────────────────────

interface SideButtonProps {
  side:   'left' | 'right'
  top:    number
  height: number
  label:  string
}

function SideButton({ side, top, height, label }: SideButtonProps) {
  const isLeft  = side === 'left'
  const isSilent = label === 'silent'

  return (
    <div
      aria-label={label}
      style={{
        position:     'absolute',
        top,
        [isLeft ? 'left' : 'right']: -3,
        width:        5,
        height,
        borderRadius: isLeft
          ? '3px 0 0 3px'
          : '0 3px 3px 0',
        background: isSilent
          ? 'linear-gradient(180deg, #9A9A9E 0%, #6C6C70 100%)'
          : TITANIUM,
        boxShadow: isLeft
          ? 'inset 1px 0 0 rgba(255,255,255,0.15), -1px 0 2px rgba(0,0,0,0.5)'
          : 'inset -1px 0 0 rgba(255,255,255,0.15), 1px 0 2px rgba(0,0,0,0.5)',
      }}
    />
  )
}
