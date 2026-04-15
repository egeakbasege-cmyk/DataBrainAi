import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ── Aetheris Design Tokens ─────────────────────────────────────────────
      colors: {
        // Existing palette (preserved)
        ink:       '#0C0C0E',
        charcoal:  '#1C1C1E',
        steel:     '#3A3A3C',
        slate:     '#71717A',
        silver:    '#A1A1AA',
        canvas:    '#FAFAF8',
        champagne: '#C9A96E',
        pearl:     '#F5F2EC',
        error:     '#991B1B',

        // Aetheris dark terminal scale — deeper obsidian layer
        obsidian: {
          DEFAULT: '#080810',
          50:  '#E8E8F0',
          100: '#C8C8D8',
          200: '#9898B8',
          300: '#686898',
          400: '#484870',
          500: '#303048',
          600: '#202030',
          700: '#14141E',
          800: '#0E0E16',
          900: '#080810',
          950: '#04040A',
        },

        // Chrome — cool metallic highlight (Swiss instrument feel)
        chrome: {
          DEFAULT: '#E2E2E8',
          dim:     '#B0B0BC',
          faint:   'rgba(226,226,232,0.08)',
          rule:    'rgba(226,226,232,0.12)',
        },

        // Gold — matte, not bright; prestige without ostentation
        gold: {
          DEFAULT: '#C9A96E',
          bright:  '#D4B980',
          dim:     '#A8873E',
          wash:    'rgba(201,169,110,0.10)',
          rule:    'rgba(201,169,110,0.20)',
        },

        // Semantic velocity indicators
        velocity: {
          positive: '#4ADE80',  // Green — strategy gaining momentum
          neutral:  '#A1A1AA',  // Silver — steady state
          negative: '#F87171',  // Red — drift alert
        },
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Swiss precision scale — no arbitrary sizes
        '2xs': ['0.625rem', { lineHeight: '1rem',    letterSpacing: '0.06em' }],
        xs:    ['0.6875rem',{ lineHeight: '1rem',    letterSpacing: '0.04em' }],
        sm:    ['0.8125rem',{ lineHeight: '1.25rem', letterSpacing: '0.02em' }],
        base:  ['1rem',     { lineHeight: '1.6rem',  letterSpacing: '0'      }],
        lg:    ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em'}],
        xl:    ['1.25rem',  { lineHeight: '1.875rem',letterSpacing: '-0.015em'}],
        '2xl': ['1.5rem',   { lineHeight: '2rem',    letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em'}],
        '4xl': ['2.25rem',  { lineHeight: '2.5rem',  letterSpacing: '-0.03em' }],
        '5xl': ['3rem',     { lineHeight: '1.2',     letterSpacing: '-0.04em' }],
        '6xl': ['3.75rem',  { lineHeight: '1.1',     letterSpacing: '-0.045em'}],
      },

      // ── Spacing ────────────────────────────────────────────────────────────
      // Basel grid — 4px base unit, multiples of 4 for vertical rhythm
      spacing: {
        px:   '1px',
        0.5:  '2px',
        1:    '4px',
        1.5:  '6px',
        2:    '8px',
        2.5:  '10px',
        3:    '12px',
        3.5:  '14px',
        4:    '16px',
        5:    '20px',
        6:    '24px',
        7:    '28px',
        8:    '32px',
        9:    '36px',
        10:   '40px',
        11:   '44px',
        12:   '48px',
        14:   '56px',
        16:   '64px',
        18:   '72px',
        20:   '80px',
        24:   '96px',
        28:   '112px',
        32:   '128px',
        36:   '144px',
        40:   '160px',
        48:   '192px',
        56:   '224px',
        64:   '256px',
        72:   '288px',
        80:   '320px',
        96:   '384px',
      },

      // ── Animations ─────────────────────────────────────────────────────────
      keyframes: {
        // Existing
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Aetheris-specific
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'drift-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
        'velocity-bar': {
          '0%':   { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        'chrome-shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'matrix-appear': {
          '0%':   { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
      },
      animation: {
        'fade-up':         'fade-up 0.4s ease both',
        'fade-in':         'fade-in 0.3s ease both',
        'slide-in-right':  'slide-in-right 0.35s ease both',
        'scale-in':        'scale-in 0.25s ease both',
        'drift-pulse':     'drift-pulse 2s ease-in-out infinite',
        'velocity-bar':    'velocity-bar 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'chrome-shimmer':  'chrome-shimmer 2.4s linear infinite',
        'matrix-appear':   'matrix-appear 0.3s ease both',
        'blink':           'blink 0.9s step-end infinite',
      },

      // ── Border radius ──────────────────────────────────────────────────────
      // Zero-radius preferred (Swiss style); sm for inputs, DEFAULT never used
      borderRadius: {
        none: '0',
        sm:   '2px',
        DEFAULT: '4px',
        md:   '6px',
        lg:   '8px',
        full: '9999px',
      },

      // ── Box shadow ─────────────────────────────────────────────────────────
      boxShadow: {
        none:       'none',
        sm:         '0 1px 3px rgba(0,0,0,0.5)',
        DEFAULT:    '0 2px 8px rgba(0,0,0,0.6)',
        md:         '0 4px 16px rgba(0,0,0,0.7)',
        lg:         '0 8px 32px rgba(0,0,0,0.8)',
        'chrome-inset': 'inset 0 1px 0 rgba(226,226,232,0.10)',
        'gold-inset':   'inset 0 1px 0 rgba(201,169,110,0.18)',
        'drift-glow':   '0 0 0 1px rgba(248,113,113,0.4), 0 4px 12px rgba(248,113,113,0.15)',
      },
    },
  },
  plugins: [],
}

export default config
