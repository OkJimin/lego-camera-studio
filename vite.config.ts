import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lets the dev server respond when reached through a tunnel (e.g.
    // cloudflared's random *.trycloudflare.com host) or a LAN IP, instead of
    // only localhost/127.0.0.1.
    allowedHosts: true,
  },
})
