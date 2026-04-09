import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:     '#FAFAF5',
        linen:     '#F0EBE0',
        parchment: '#E5DECE',
        ink:       '#1A1814',
        muted:     '#7A7062',
        green:     '#2B4A2A',
        navy:      '#1B3649',
        gold:      '#C4973A',
        claret:    '#6B2737',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:  ['Jost', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.45s ease both',
        'fade-in':  'fade-in 0.35s ease both',
      },
    },
  },
  plugins: [],
}

export default config
