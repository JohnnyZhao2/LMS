/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Space Theme Palette
        background: {
          DEFAULT: '#0B101B', // Deepest Navy
          secondary: '#131B2C', // Panel BG
          tertiary: '#1C253B', // Hover/Card BG
        },
        primary: {
          DEFAULT: '#00E5FF', // Electric Cyan
          hover: '#33EBFF',
          dark: '#00B8CC',
        },
        accent: {
          DEFAULT: '#FFC107', // Neon Amber
          hover: '#FFCA2C',
        },
        status: {
          success: '#4ADE80', // Mint Green
          error: '#F87171', // Coral Red
          warning: '#FBBF24',
          info: '#60A5FA',
        },
        text: {
          primary: '#F1F5F9', // Slate 100
          secondary: '#94A3B8', // Slate 400
          muted: '#64748B', // Slate 500
        }
      },
      fontFamily: {
        heading: ['Outfit', 'Noto Sans SC', 'sans-serif'],
        body: ['Inter', 'Noto Sans SC', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 3s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 229, 255, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)' },
        },
        shimmer: {
          'from': { backgroundPosition: '0 0' },
          'to': { backgroundPosition: '-200% 0' },
        }
      }
    },
  },
  plugins: [],
}
