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
        navy:    '#0A0F1E',
        crimson: '#C0392B',
        'navy-2': '#111827',
        'navy-3': '#1C2333',
        'navy-4': '#243044',
        dim:     '#94A3B8',
        ink:     '#F1F5F9',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'spin-full': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.4s ease both',
        'fade-in':  'fade-in 0.3s ease both',
        'spin-full': 'spin-full 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
