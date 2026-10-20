import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: (asset) => asset.name?.endsWith('.css')
          ? 'assets/app.css'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
