/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Luminous Void Theme
        background: {
          DEFAULT: '#030014', // Deepest Void
          secondary: '#0F0529', // Card/Panel BG
          tertiary: '#1A0B3B', // Hover state
          glass: 'rgba(15, 5, 41, 0.7)', // Glassmorphism base
        },
        primary: {
          DEFAULT: '#B026FF', // Electric Purple
          hover: '#C566FF',
          glow: 'rgba(176, 38, 255, 0.5)',
        },
        secondary: {
          DEFAULT: '#00F0FF', // Cyber Cyan
          hover: '#66F5FF',
        },
        accent: {
          DEFAULT: '#CCFF00', // Neon Lime
          hover: '#DDFF66',
        },
        surface: {
          50: '#080214',
          100: '#0F0529',
          200: '#1A0B3B',
          300: '#2D1555',
          400: '#452270',
          500: '#643496',
        },
        status: {
          success: '#00FFA3', // Neon Mint
          error: '#FF2E5F', // Neon Red
          warning: '#FFC800', // Neon Gold
          info: '#00F0FF', // Cyan
        },
        text: {
          primary: '#FFFFFF', 
          secondary: '#B4B0C4', 
          muted: '#7B7594', 
        }
      },
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up-fade': 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 3s infinite',
        'gradient-x': 'gradientX 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUpFade: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(176, 38, 255, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(176, 38, 255, 0.6)' },
        },
        gradientX: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}