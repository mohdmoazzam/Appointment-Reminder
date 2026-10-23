import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward /api calls to the NestJS server during development
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
