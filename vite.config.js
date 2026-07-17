import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single-page 360 tour. Static build -> deploy anywhere (Vercel, Netlify, static host).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
})
