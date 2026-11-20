import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // The production build is served from GitHub Pages at https://janiwo.github.io/eingekreist/.
  // `npm run preview` mirrors that; dev server, e2e tests and screenshots keep running at the root.
  base: command === 'build' || isPreview ? '/eingekreist/' : '/',
  plugins: [react()],
}))
