import { defineConfig, loadEnv } from 'vite'
import path from 'path'

// Vite config for local dev
// - Proxies /api requests to the Azure Functions host
// - Sets @ alias to src for cleaner imports

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const fnPort = process.env.VITE_FUNCTIONS_PORT || env.VITE_FUNCTIONS_PORT || '7071'
  const apiUrl = env.VITE_API_URL || `http://localhost:${fnPort}`
  return {
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'vendor-react'
              if (id.includes('katex')) return 'vendor-katex'
              if (id.includes('i18next')) return 'vendor-i18n'
              if (id.includes('react-router')) return 'vendor-router'
              if (id.includes('react-easy-crop')) return 'vendor-cropper'
              return 'vendor'
            }
          }
        }
      }
    }
  }
})
