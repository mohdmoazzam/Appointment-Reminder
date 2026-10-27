import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_DEV_SERVER = 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Keep in sync with "paths" in tsconfig.app.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Forward /api calls to the NestJS server during development.
    proxy: { '/api': API_DEV_SERVER },
  },
  preview: {
    port: 4173,
    proxy: { '/api': API_DEV_SERVER },
  },
});
