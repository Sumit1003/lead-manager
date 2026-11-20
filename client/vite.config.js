import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development, /api requests are proxied to the Express server on :5000,
// so the frontend can use relative URLs and no CORS setup is needed.
// In production the Express server serves the built app itself (same origin).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
