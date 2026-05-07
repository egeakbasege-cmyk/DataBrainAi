import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sail Intelligence design tokens
        sail: {
          900: '#050b14',   // deepest background
          800: '#0a1628',   // card background
          700: '#0f2240',   // border / elevated surface
          600: '#163059',   // subtle accent
          accent:  '#00d4ff',  // electric cyan  — primary action
          gold:    '#f0b429',  // amber          — warnings / HITL
          success: '#10b981',  // emerald        — approved / positive
          danger:  '#ef4444',  // red            — anomaly / reject
          muted:   '#64748b',  // slate          — secondary text
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker':     'flicker 4s linear infinite',
        'slide-in-up': 'slideInUp 0.3s ease-out',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.85' },
        },
        slideInUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      boxShadow: {
        'glow-cyan':  '0 0 20px rgba(0, 212, 255, 0.25)',
        'glow-gold':  '0 0 20px rgba(240, 180, 41, 0.25)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.20)',
      },
    },
  },
  plugins: [],
}

export default config
