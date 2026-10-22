import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.GITHUB_SHA?.slice(0, 12) || new Date().toISOString();

export default defineConfig({
  define: { 'import.meta.env.VITE_APP_BUILD': JSON.stringify(buildId) },
  plugins: [react(), {
    name: 'bottletrack-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) });
    },
  }],
  base: './',
})
