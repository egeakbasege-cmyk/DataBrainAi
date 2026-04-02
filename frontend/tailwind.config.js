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
        bg:        '#060c1a',
        surface:   '#080f1e',
        card:      '#0b1325',
        border:    '#1a2840',
        green:     '#2de8a0',
        accent:    '#2bc4e8',
        gold:      '#f0c840',
        warning:   '#e09030',
        danger:    '#e06060',
        muted:     '#4a6080',
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
        sans:    ['IBM Plex Sans', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        pill: '20px',
        chip: '6px',
      },
      boxShadow: {
        green:   '0 0 20px #2de8a033',
        accent:  '0 0 20px #2bc4e833',
        gold:    '0 0 20px #f0c84033',
        warning: '0 0 20px #e0903033',
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease forwards',
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
