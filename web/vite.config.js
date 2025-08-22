import { defineConfig, loadEnv } from 'vite'
import path from 'path'

// Vite config for local dev
// - Proxies /api requests to the Azure Functions host
// - Sets @ alias to src for cleaner imports

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = env.VITE_API_URL || `http://localhost:${env.VITE_FUNCTIONS_PORT || '7071'}`
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
    }
  }
})
