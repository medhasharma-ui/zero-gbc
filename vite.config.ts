import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // When running `vercel dev`, Vercel serves both Vite and /api/* on the same port.
      // This proxy is only needed if you run plain `vite` without `vercel dev`.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
