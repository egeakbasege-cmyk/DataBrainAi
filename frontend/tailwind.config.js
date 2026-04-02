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
        bg:      '#07080e',
        surface: '#0b0d16',
        card:    '#0d1020',
        border:  '#1b2333',
        ink:     '#dce4f5',
        dim:     '#526478',
        green:   '#1ed48a',
        accent:  '#18b8e0',
        gold:    '#e8bb28',
        warning: '#d4821e',
        danger:  '#c94f4f',
        muted:   '#4d6178',
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono:    ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        sans:    ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        'widest-2': '0.18em',
        'widest-3': '0.28em',
      },
      lineHeight: {
        'editorial': '1.08',
      },
      borderRadius: {
        card: '6px',
        pill: '999px',
        chip: '3px',
      },
      boxShadow: {
        green:       '0 0 24px #1ed48a22',
        accent:      '0 0 24px #18b8e022',
        gold:        '0 0 24px #e8bb2822',
        warning:     '0 0 24px #d4821e22',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.04)',
        'card':      '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'fade-up':      'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':      'fadeIn 0.35s ease forwards',
        'slide-in':     'slideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'blink':        'blink 1.1s step-end infinite',
        'draw-line':    'drawLine 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
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
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
