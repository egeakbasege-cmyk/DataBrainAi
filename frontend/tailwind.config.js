/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core Airy Chrome tokens
        bg:      '#FFFFFF',
        surface: '#FDFDFD',
        card:    '#FFFFFF',
        border:  '#E5E7EB',
        ink:     '#1E293B',
        dim:     '#64748B',
        muted:   '#94A3B8',
        chrome:  '#CBD5E1',
        green:   '#16A34A',
        accent:  '#FACC15',
        gold:    '#FACC15',
        warning: '#F59E0B',
        danger:  '#EF4444',
        // Named Airy Chrome aliases
        'airy-white':     '#FFFFFF',
        'airy-pearl':     '#FDFDFD',
        'airy-silver':    '#E5E7EB',
        'kinetic-yellow': '#FACC15',
        'text-main':      '#334155',
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['ui-monospace', 'SF Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        'widest-2': '0.12em',
        'widest-3': '0.2em',
      },
      lineHeight: {
        'editorial': '1.08',
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
        chip: '6px',
      },
      boxShadow: {
        'sm':      '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card':    '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'md':      '0 4px 16px rgba(0,0,0,0.08)',
        'lg':      '0 8px 32px rgba(0,0,0,0.10)',
        'dock':    '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(229,231,235,0.8)',
        'glass':   '0 4px 30px rgba(0,0,0,0.03)',
        'yellow':  '0 0 20px rgba(250,204,21,0.35)',
        'accent':  '0 0 20px rgba(250,204,21,0.3)',
        'green':   '0 0 20px rgba(22,163,74,0.2)',
        'gold':    '0 0 20px rgba(250,204,21,0.3)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.8)',
      },
      animation: {
        'fade-up':    'fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'slide-in':   'slideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'blink':      'blink 1.1s step-end infinite',
        'draw-line':  'drawLine 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'dock-in':    'dockIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        drawLine: {
          '0%':   { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        dockIn: {
          '0%':   { opacity: '0', transform: 'translateX(-50%) translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
