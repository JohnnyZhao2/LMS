import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    process.env.ANALYZE === 'true' ? visualizer({
      filename: 'dist/bundle-report.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }) : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'vendor-react'
          }
          if (id.includes('/react-router')) return 'vendor-router'
          if (id.includes('/@tanstack/')) return 'vendor-data'
          if (id.includes('/@dnd-kit/')) return 'vendor-dnd'
          if (id.includes('/react-hook-form/') || id.includes('/@hookform/') || id.includes('/zod/')) {
            return 'vendor-forms'
          }
          if (
            id.includes('/@radix-ui/') ||
            id.includes('/lucide-react/') ||
            id.includes('/react-day-picker/') ||
            id.includes('/sonner/')
          ) {
            return 'vendor-ui'
          }
          if (id.includes('/dayjs/') || id.includes('/date-fns/')) return 'vendor-dates'
          return undefined
        },
      },
    },
  },
})
