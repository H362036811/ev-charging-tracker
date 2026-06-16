import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ev-charging-tracker/',
  server: {
    port: 5174,
    host: true
  }
})
