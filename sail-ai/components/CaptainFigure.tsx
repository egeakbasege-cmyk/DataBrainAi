'use client'

import { motion } from 'framer-motion'

/**
 * CaptainFigure — an illustrated naval captain with:
 * - Animated eye blink
 * - Subtle breathing motion
 * - Gentle head tilt on mount
 * - Champagne gold accent details (matches Sail AI palette)
 */
export function CaptainFigure({ size = 88 }: { size?: number }) {
  const scale = size / 88

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ width: size, height: size * (100 / 88), flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size * (100 / 88)}
        viewBox="0 0 88 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Shadow ──────────────────────────── */}
        <ellipse cx="44" cy="98" rx="22" ry="3" fill="rgba(12,12,14,0.08)" />

        {/* ── Coat / body ─────────────────────── */}
        <motion.g
          animate={{ scaleY: [1, 1.012, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '44px 80px' }}
        >
          {/* Main coat */}
          <path
            d="M18 62 Q28 57 44 56 Q60 57 70 62 L74 95 H14 Z"
            fill="#163450"
          />
          {/* Coat lapels */}
          <path d="M44 56 L38 70 L44 68 L50 70 L44 56 Z" fill="#FAFAF8" opacity="0.92" />
          {/* Lapel shadow */}
          <path d="M44 56 L38 70 L44 68" fill="rgba(12,12,14,0.08)" />
          {/* Coat shading */}
          <path d="M18 62 Q28 57 35 57 L28 95 H14 Z" fill="rgba(12,12,14,0.12)" />
          {/* Centre button line */}
          <line x1="44" y1="68" x2="44" y2="95" stroke="rgba(12,12,14,0.1)" strokeWidth="0.5" strokeDasharray="3 3" />
          {/* Buttons */}
          {[74, 81, 88].map((y, i) => (
            <circle key={i} cx="44" cy={y - 8} r="1.8" fill="#C9A96E" />
          ))}
        </motion.g>

        {/* ── Epaulettes ──────────────────────── */}
        <g>
          {/* Left */}
          <rect x="12" y="61" width="10" height="5" rx="1.5" fill="#C9A96E" opacity="0.9" />
          <line x1="13" y1="63" x2="21" y2="63" stroke="rgba(12,12,14,0.2)" strokeWidth="0.6" />
          <circle cx="12.5" cy="63" r="1" fill="#C9A96E" />
          <circle cx="21.5" cy="63" r="1" fill="#C9A96E" />
          {/* Right */}
          <rect x="66" y="61" width="10" height="5" rx="1.5" fill="#C9A96E" opacity="0.9" />
          <line x1="67" y1="63" x2="75" y2="63" stroke="rgba(12,12,14,0.2)" strokeWidth="0.6" />
          <circle cx="66.5" cy="63" r="1" fill="#C9A96E" />
          <circle cx="75.5" cy="63" r="1" fill="#C9A96E" />
        </g>

        {/* ── Anchor badge (left breast) ──────── */}
        <g transform="translate(22, 68)" opacity="0.7">
          <circle cx="6" cy="3.5" r="2.2" stroke="#C9A96E" strokeWidth="0.9" />
          <line x1="6" y1="5.7" x2="6" y2="12" stroke="#C9A96E" strokeWidth="0.9" />
          <line x1="3" y1="8.5" x2="9" y2="8.5" stroke="#C9A96E" strokeWidth="0.9" />
          <path d="M3 12 Q6 10.5 9 12" stroke="#C9A96E" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </g>

        {/* ── Neck ────────────────────────────── */}
        <rect x="38" y="52" width="12" height="7" rx="3" fill="#E8C99A" />
        {/* Collar */}
        <path d="M36 58 L44 62 L52 58" fill="none" stroke="#FAFAF8" strokeWidth="1.5" strokeLinejoin="round" />

        {/* ── Head ────────────────────────────── */}
        <motion.g
          animate={{ rotate: [0, 1, -0.5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.3, 0.7, 1] }}
          style={{ transformOrigin: '44px 52px' }}
        >
          {/* Head shape */}
          <ellipse cx="44" cy="40" rx="14.5" ry="15.5" fill="#E8C99A" />
          {/* Jaw shadow */}
          <ellipse cx="44" cy="51" rx="10" ry="4" fill="rgba(12,12,14,0.07)" />
          {/* Cheek blush */}
          <ellipse cx="34" cy="42" rx="3.5" ry="2" fill="rgba(220,140,100,0.15)" />
          <ellipse cx="54" cy="42" rx="3.5" ry="2" fill="rgba(220,140,100,0.15)" />

          {/* ── Eyes ─────────────────────────── */}
          {/* Left eye */}
          <ellipse cx="37.5" cy="38" rx="2.8" ry="3" fill="#1A2F4A" />
          <ellipse cx="37.5" cy="38" rx="1.4" ry="1.5" fill="#2A4A6E" />
          <circle cx="38.3" cy="37.2" r="0.9" fill="white" />
          <circle cx="37.2" cy="38.5" r="0.4" fill="white" opacity="0.5" />
          {/* Right eye */}
          <ellipse cx="50.5" cy="38" rx="2.8" ry="3" fill="#1A2F4A" />
          <ellipse cx="50.5" cy="38" rx="1.4" ry="1.5" fill="#2A4A6E" />
          <circle cx="51.3" cy="37.2" r="0.9" fill="white" />
          <circle cx="50.2" cy="38.5" r="0.4" fill="white" opacity="0.5" />

          {/* Animated blink */}
          <motion.g
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 4.2, ease: 'easeInOut' }}
            style={{ transformOrigin: '44px 38px' }}
          >
            <rect x="34.5" y="35.5" width="6.2" height="5.5" rx="2.5" fill="#E8C99A" />
            <rect x="47.5" y="35.5" width="6.2" height="5.5" rx="2.5" fill="#E8C99A" />
          </motion.g>

          {/* ── Eyebrows ─────────────────────── */}
          <path d="M34 33.5 Q37.5 31.5 41 33" stroke="#8B6B1A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path d="M47 33 Q50.5 31.5 54 33.5" stroke="#8B6B1A" strokeWidth="1.3" strokeLinecap="round" fill="none" />

          {/* ── Nose ─────────────────────────── */}
          <path d="M44 39 L42.5 44.5 Q44 45.5 45.5 44.5 Z" fill="rgba(12,12,14,0.08)" />
          <ellipse cx="42.5" cy="44.5" rx="1.2" ry="0.8" fill="rgba(12,12,14,0.1)" />
          <ellipse cx="45.5" cy="44.5" rx="1.2" ry="0.8" fill="rgba(12,12,14,0.1)" />

          {/* ── Moustache ─────────────────────── */}
          <path d="M37 47 Q40 45 44 46.5 Q48 45 51 47" fill="#7A5A10" opacity="0.85" />
          <path d="M37 47 Q40 45.5 44 47 Q48 45.5 51 47 Q48 48.5 44 47.5 Q40 48.5 37 47 Z" fill="#8B6B1A" opacity="0.7" />

          {/* ── Mouth ─────────────────────────── */}
          <path d="M40 49.5 Q44 51.5 48 49.5" stroke="#8B6B1A" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />

          {/* ── Ear details ─────────────────── */}
          <ellipse cx="29.5" cy="40" rx="2.5" ry="3.5" fill="#DCAF80" />
          <ellipse cx="29.8" cy="40" rx="1.3" ry="2" fill="#E8C99A" />
          <ellipse cx="58.5" cy="40" rx="2.5" ry="3.5" fill="#DCAF80" />
          <ellipse cx="58.2" cy="40" rx="1.3" ry="2" fill="#E8C99A" />

          {/* ── Captain's hat ─────────────────── */}
          {/* Hat brim */}
          <rect x="25" y="25" width="38" height="5" rx="2" fill="#163450" />
          {/* Brim highlight */}
          <rect x="25" y="25" width="38" height="1.5" rx="1" fill="rgba(255,255,255,0.08)" />
          {/* Hat body */}
          <rect x="30" y="10" width="28" height="16" rx="3" fill="#163450" />
          {/* Hat crown line */}
          <rect x="30" y="10" width="28" height="2" rx="2" fill="rgba(255,255,255,0.05)" />
          {/* Gold band */}
          <rect x="30" y="22" width="28" height="3" rx="0" fill="#C9A96E" />
          {/* Band sheen */}
          <rect x="30" y="22" width="28" height="1" fill="rgba(255,255,255,0.2)" />
          {/* Hat emblem */}
          <g transform="translate(37, 12)">
            {/* Anchor */}
            <circle cx="7" cy="4" r="2.5" stroke="#C9A96E" strokeWidth="1" fill="none" />
            <line x1="7" y1="6.5" x2="7" y2="12" stroke="#C9A96E" strokeWidth="1" />
            <line x1="4" y1="9" x2="10" y2="9" stroke="#C9A96E" strokeWidth="1" />
            <path d="M4 12 Q7 11 10 12" stroke="#C9A96E" strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Wreath */}
            <path d="M2 7 Q0 5 2 3" stroke="#C9A96E" strokeWidth="0.7" fill="none" opacity="0.6" />
            <path d="M12 7 Q14 5 12 3" stroke="#C9A96E" strokeWidth="0.7" fill="none" opacity="0.6" />
          </g>
          {/* Hat side shadow */}
          <rect x="30" y="10" width="6" height="16" rx="0" fill="rgba(12,12,14,0.1)" />
        </motion.g>
      </svg>
    </motion.div>
  )
}
