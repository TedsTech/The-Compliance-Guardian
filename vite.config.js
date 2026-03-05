import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy Bright Data SSE stream (GET — establishes session)
      '/brightdata-sse': {
        target: 'https://mcp.brightdata.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/brightdata-sse/, '/sse'),
        secure: true
      },
      // Proxy Bright Data message POST (tool calls within SSE session)
      '/brightdata-message': {
        target: 'https://mcp.brightdata.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/brightdata-message/, '/message'),
        secure: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
