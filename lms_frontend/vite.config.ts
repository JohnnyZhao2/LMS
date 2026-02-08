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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'vendor-editor'
          }
          if (id.includes('@radix-ui')) {
            return 'vendor-radix'
          }
          if (id.includes('@tanstack')) {
            return 'vendor-tanstack'
          }
          if (
            id.includes('react') ||
            id.includes('scheduler') ||
            id.includes('react-dom') ||
            id.includes('react-router')
          ) {
            return 'vendor-react'
          }
          return 'vendor-misc'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
