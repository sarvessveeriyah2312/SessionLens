/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,html}',
    './src/index.html'
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f0f0f',
          card: '#1a1a1a',
          hover: '#222222'
        },
        border: {
          DEFAULT: '#2a2a2a',
          focus: '#00f5ff'
        },
        accent: {
          DEFAULT: '#00f5ff',
          dim: '#00c8d4',
          glow: 'rgba(0,245,255,0.15)'
        },
        status: {
          active: '#22c55e',
          idle: '#eab308',
          exited: '#6b7280',
          completed: '#3b82f6'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace']
      },
      boxShadow: {
        card: '0 0 0 1px #2a2a2a',
        'card-hover': '0 0 0 1px #404040',
        'accent-glow': '0 0 12px rgba(0,245,255,0.25)'
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: []
}
