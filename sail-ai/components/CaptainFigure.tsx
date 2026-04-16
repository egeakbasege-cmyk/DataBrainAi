'use client'

import { motion } from 'framer-motion'

/**
 * CaptainFigure — a distinguished naval captain with:
 * - Realistic human proportions and facial structure
 * - Animated eye blink with natural timing
 * - Subtle breathing + gentle head sway
 * - Navy uniform with gold epaulettes and anchor badge
 * - Champagne gold accent details matching Sail AI palette
 */
export function CaptainFigure({ size = 96 }: { size?: number }) {
  const scale = size / 96

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ width: size, height: size * (110 / 96), flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size * (110 / 96)}
        viewBox="0 0 96 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Skin gradient */}
          <radialGradient id="skin" cx="50%" cy="40%" r="55%">
            <stop offset="0%"   stopColor="#F2D4A8" />
            <stop offset="60%"  stopColor="#E8C090" />
            <stop offset="100%" stopColor="#D4A870" />
          </radialGradient>
          {/* Coat gradient */}
          <linearGradient id="coat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#1A3F60" />
            <stop offset="100%" stopColor="#0F2840" />
          </linearGradient>
          {/* Gold gradient */}
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#D4A95A" />
            <stop offset="100%" stopColor="#B8882E" />
          </linearGradient>
          {/* Shadow under figure */}
          <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(12,12,14,0.18)" />
            <stop offset="100%" stopColor="rgba(12,12,14,0)" />
          </radialGradient>
        </defs>

        {/* ── Ground shadow ──────────────────────── */}
        <ellipse cx="48" cy="107" rx="26" ry="3.5" fill="url(#shadow)" />

        {/* ── Coat / Body ────────────────────────── */}
        <motion.g
          animate={{ scaleY: [1, 1.014, 1] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '48px 85px' }}
        >
          {/* Main coat body */}
          <path
            d="M20 66 Q30 60 48 59 Q66 60 76 66 L80 107 H16 Z"
            fill="url(#coat)"
          />
          {/* Left coat shadow */}
          <path d="M20 66 Q30 60 36 60 L28 107 H16 Z" fill="rgba(0,0,0,0.18)" />
          {/* Right coat highlight */}
          <path d="M76 66 Q66 60 62 61 L70 107 H80 Z" fill="rgba(255,255,255,0.04)" />

          {/* Lapels — white shirt visible */}
          <path d="M48 59 L40 76 L48 73 L56 76 L48 59 Z" fill="#F5F5F0" opacity="0.95" />
          {/* Lapel shadow fold */}
          <path d="M48 59 L40 76 L48 73 Z" fill="rgba(0,0,0,0.07)" />

          {/* Tie — navy with thin gold stripe */}
          <path d="M46 72 L48 80 L50 72 L48 68 Z" fill="#0A1E30" />
          <line x1="48" y1="69" x2="48" y2="80" stroke="#C9A96E" strokeWidth="0.5" opacity="0.6" />

          {/* Centre button placket */}
          <line x1="48" y1="77" x2="48" y2="107" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4 3" />

          {/* Buttons */}
          {[80, 88, 96].map((y, i) => (
            <g key={i}>
              <circle cx="48" cy={y} r="2.2" fill="url(#gold)" />
              <circle cx="48" cy={y} r="1" fill="rgba(255,255,255,0.3)" />
            </g>
          ))}

          {/* Pocket — left breast */}
          <rect x="22" y="76" width="9" height="6" rx="1" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

          {/* Anchor badge on breast pocket */}
          <g transform="translate(25, 77)" opacity="0.85">
            <circle cx="3" cy="1.8" r="1.5" stroke="#C9A96E" strokeWidth="0.8" fill="none" />
            <line x1="3" y1="3.3" x2="3" y2="7" stroke="#C9A96E" strokeWidth="0.8" />
            <line x1="1.2" y1="5.2" x2="4.8" y2="5.2" stroke="#C9A96E" strokeWidth="0.8" />
            <path d="M1.2 7 Q3 6.2 4.8 7" stroke="#C9A96E" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          </g>
        </motion.g>

        {/* ── Epaulettes ─────────────────────────── */}
        {/* Left */}
        <g>
          <rect x="13" y="64" width="12" height="5.5" rx="2" fill="url(#gold)" />
          <rect x="13" y="64" width="12" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
          {[15, 18, 21].map(x => <circle key={x} cx={x} cy="69" r="1.2" fill="#C9A96E" />)}
        </g>
        {/* Right */}
        <g>
          <rect x="71" y="64" width="12" height="5.5" rx="2" fill="url(#gold)" />
          <rect x="71" y="64" width="12" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
          {[73, 76, 79].map(x => <circle key={x} cx={x} cy="69" r="1.2" fill="#C9A96E" />)}
        </g>

        {/* ── Neck ───────────────────────────────── */}
        <rect x="40" y="54" width="16" height="8" rx="4" fill="url(#skin)" />
        {/* Collar */}
        <path d="M38 60 L48 65 L58 60" fill="none" stroke="#F5F5F0" strokeWidth="1.8" strokeLinejoin="round" />

        {/* ── Head ───────────────────────────────── */}
        <motion.g
          animate={{ rotate: [0, 0.8, -0.5, 0.3, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }}
          style={{ transformOrigin: '48px 50px' }}
        >
          {/* Head base shape — realistic oval */}
          <ellipse cx="48" cy="37" rx="17" ry="19" fill="url(#skin)" />

          {/* Jawline definition */}
          <path d="M34 44 Q38 52 48 55 Q58 52 62 44" fill="url(#skin)" />

          {/* Jaw shadow */}
          <ellipse cx="48" cy="53" rx="11" ry="3.5" fill="rgba(0,0,0,0.06)" />

          {/* Cheek blush — subtle */}
          <ellipse cx="35" cy="40" rx="4" ry="2.5" fill="rgba(210,130,90,0.12)" />
          <ellipse cx="61" cy="40" rx="4" ry="2.5" fill="rgba(210,130,90,0.12)" />

          {/* ── Eyes ───────────────────────────── */}
          {/* Eye socket shadows */}
          <ellipse cx="39" cy="36" rx="4" ry="3.5" fill="rgba(0,0,0,0.06)" />
          <ellipse cx="57" cy="36" rx="4" ry="3.5" fill="rgba(0,0,0,0.06)" />

          {/* Left eye — iris + pupil */}
          <ellipse cx="39" cy="36" rx="3.5" ry="3.8" fill="#FAFAF8" />
          <ellipse cx="39" cy="36" rx="2.2" ry="2.4" fill="#2A4A70" />
          <ellipse cx="39" cy="36" rx="1.2" ry="1.3" fill="#0C1A2A" />
          <circle  cx="40.1" cy="34.8" r="1" fill="white" />
          <circle  cx="38.4" cy="37.2" r="0.45" fill="rgba(255,255,255,0.5)" />

          {/* Right eye */}
          <ellipse cx="57" cy="36" rx="3.5" ry="3.8" fill="#FAFAF8" />
          <ellipse cx="57" cy="36" rx="2.2" ry="2.4" fill="#2A4A70" />
          <ellipse cx="57" cy="36" rx="1.2" ry="1.3" fill="#0C1A2A" />
          <circle  cx="58.1" cy="34.8" r="1" fill="white" />
          <circle  cx="56.4" cy="37.2" r="0.45" fill="rgba(255,255,255,0.5)" />

          {/* Eyelids */}
          <path d="M35.5 33.5 Q39 32 42.5 33.5" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none" strokeLinecap="round" />
          <path d="M53.5 33.5 Q57 32 60.5 33.5" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none" strokeLinecap="round" />
          <path d="M35.5 38.5 Q39 39.5 42.5 38.5" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" fill="none" strokeLinecap="round" />
          <path d="M53.5 38.5 Q57 39.5 60.5 38.5" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" fill="none" strokeLinecap="round" />

          {/* Animated blink */}
          <motion.g
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 0.12, repeat: Infinity, repeatDelay: 4.8, ease: 'easeInOut' }}
            style={{ transformOrigin: '48px 36px' }}
          >
            <ellipse cx="39" cy="36" rx="3.8" ry="3.5" fill="url(#skin)" />
            <ellipse cx="57" cy="36" rx="3.8" ry="3.5" fill="url(#skin)" />
          </motion.g>

          {/* ── Eyebrows — strong, distinguished ── */}
          <path d="M34.5 30 Q39 27.5 43.5 30" stroke="#6B4A18" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M52.5 30 Q57 27.5 61.5 30" stroke="#6B4A18" strokeWidth="1.6" strokeLinecap="round" fill="none" />

          {/* ── Nose — defined bridge ──────────── */}
          <path d="M48 37 L46 44 Q48 46 50 44 L48 37 Z" fill="rgba(0,0,0,0.05)" />
          <path d="M46 44.5 Q44.5 46 45.5 46.8" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M50 44.5 Q51.5 46 50.5 46.8" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" fill="none" strokeLinecap="round" />

          {/* ── Moustache — distinguished grey ─── */}
          <path d="M40 48.5 Q44 46.5 48 48 Q52 46.5 56 48.5" fill="#8B7355" opacity="0.8" />
          <path d="M40 48.5 Q44 47 48 48.5 Q52 47 56 48.5 Q52 50 48 49.2 Q44 50 40 48.5 Z" fill="#7A6245" opacity="0.65" />
          {/* Grey streaks in moustache */}
          <path d="M43 47.5 Q44.5 47 46 47.5" stroke="#C0B090" strokeWidth="0.6" fill="none" opacity="0.5" />
          <path d="M50 47.5 Q51.5 47 53 47.5" stroke="#C0B090" strokeWidth="0.6" fill="none" opacity="0.5" />

          {/* ── Mouth — composed smile ─────────── */}
          <path d="M43 51 Q48 53.5 53 51" stroke="#8B6B1A" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />

          {/* ── Ears ───────────────────────────── */}
          <ellipse cx="31" cy="38" rx="3" ry="4.5" fill="#DBA070" />
          <ellipse cx="31.4" cy="38" rx="1.6" ry="2.8" fill="url(#skin)" />
          <path d="M30 36.5 Q32 38 30 39.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" fill="none" />
          <ellipse cx="65" cy="38" rx="3" ry="4.5" fill="#DBA070" />
          <ellipse cx="64.6" cy="38" rx="1.6" ry="2.8" fill="url(#skin)" />

          {/* ── Sideburns / temples — grey ─────── */}
          <path d="M31.5 30 Q32.5 26 35 24" stroke="#A09080" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.45" />
          <path d="M64.5 30 Q63.5 26 61 24" stroke="#A09080" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.45" />

          {/* ── Captain's hat ──────────────────── */}
          {/* Hat brim */}
          <rect x="27" y="20" width="42" height="5.5" rx="2.5" fill="#0F2840" />
          <rect x="27" y="20" width="42" height="1.5" rx="1" fill="rgba(255,255,255,0.07)" />
          {/* Hat body */}
          <rect x="32" y="4"  width="32" height="17" rx="3.5" fill="#163450" />
          {/* Hat body shadow on left */}
          <rect x="32" y="4"  width="7"  height="17" rx="0" fill="rgba(0,0,0,0.12)" />
          {/* Hat crown crease */}
          <rect x="32" y="4"  width="32" height="2.5" rx="2.5" fill="rgba(255,255,255,0.05)" />
          {/* Gold band */}
          <rect x="32" y="18" width="32" height="3.5" rx="0" fill="url(#gold)" />
          <rect x="32" y="18" width="32" height="1.2" fill="rgba(255,255,255,0.22)" />

          {/* Emblem — anchor in wreath */}
          <g transform="translate(39, 6)">
            <circle cx="9" cy="5.5" r="3.2" stroke="#C9A96E" strokeWidth="1.1" fill="none" />
            <line x1="9" y1="8.7"  x2="9"  y2="15"  stroke="#C9A96E" strokeWidth="1.1" />
            <line x1="5.5" y1="12" x2="12.5" y2="12" stroke="#C9A96E" strokeWidth="1.1" />
            <path d="M5.5 15 Q9 13.5 12.5 15" stroke="#C9A96E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            {/* Laurel sprigs */}
            <path d="M3.5 9 Q1 7.5 3 5.5" stroke="#C9A96E" strokeWidth="0.8" fill="none" opacity="0.65" />
            <path d="M14.5 9 Q17 7.5 15 5.5" stroke="#C9A96E" strokeWidth="0.8" fill="none" opacity="0.65" />
            <path d="M2.5 7 Q0.5 5.5 2 4" stroke="#C9A96E" strokeWidth="0.7" fill="none" opacity="0.45" />
            <path d="M15.5 7 Q17.5 5.5 16 4" stroke="#C9A96E" strokeWidth="0.7" fill="none" opacity="0.45" />
          </g>
        </motion.g>
      </svg>
    </motion.div>
  )
}
