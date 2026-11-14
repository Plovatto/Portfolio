import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { seoPages } from './seo/pages.ts'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.VITE_BASE ?? '/Portfolio/') : '/',
  plugins: [react(), seoPages()],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
  },
}))
