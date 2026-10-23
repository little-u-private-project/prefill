import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

// The Cloudflare plugin runs worker/ in workerd with a local D1 during `vite dev`,
// and builds the Worker + static assets for `wrangler deploy`.
export default defineConfig({
  plugins: [react(), cloudflare()],
})
