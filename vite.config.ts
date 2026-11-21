import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.config.ts'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    target: 'chrome116',
  },
  server: {
    port: 4179,
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
})
