import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  define: { 'import.meta.env.VITE_APP_BUILD': JSON.stringify(process.env.GITHUB_SHA?.slice(0, 12) || new Date().toISOString()) },
  plugins: [react(), {
    name: 'bottletrack-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: process.env.GITHUB_SHA?.slice(0, 12) || this.meta.watchMode && 'development' || buildId }) });
    },
  }],
  base: './',
})
