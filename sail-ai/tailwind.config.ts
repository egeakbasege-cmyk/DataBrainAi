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
      colors: {
        ink:       '#0C0C0E',
        charcoal:  '#1C1C1E',
        steel:     '#3A3A3C',
        slate:     '#71717A',
        silver:    '#A1A1AA',
        canvas:    '#FAFAF8',
        champagne: '#C9A96E',
        pearl:     '#F5F2EC',
        error:     '#991B1B',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease both',
        'fade-in': 'fade-in 0.3s ease both',
      },
    },
  },
  plugins: [],
}

export default config
