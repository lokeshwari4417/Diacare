/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        ink: '#0F172A',
        muted: '#475569',
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#EFF6FF',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          light: '#E0F2FE',
        },
        risk: {
          low: '#10B981',
          lowBg: '#D1FAE5',
          moderate: '#F59E0B',
          moderateBg: '#FEF3C7',
          high: '#EF4444',
          highBg: '#FEE2E2',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -6px rgba(31, 42, 42, 0.10)',
        card: '0 2px 12px -2px rgba(31, 42, 42, 0.08)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.08)', opacity: '0.9' },
        },
        wave: {
          '0%': { strokeDashoffset: '400' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        breathe: 'breathe 4.5s ease-in-out infinite',
        wave: 'wave 2.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
