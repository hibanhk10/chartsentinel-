import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: {
      // The `three-vendor` chunk is ~1.2 MB and only needed on marketing
      // routes that mount <CanvasWrapper>. Strip it from the entry HTML's
      // modulepreload list so functional routes (dashboard, legal, contact)
      // never download it. Dynamic-import preloads (hostType !== 'html')
      // are left untouched, so marketing routes still warm the chunk
      // alongside the lazy import.
      resolveDependencies: (_filename, deps, { hostType }) =>
        hostType === 'html' ? deps.filter((d) => !d.includes('three-vendor')) : deps,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy 3D / rendering libraries → separate chunk, loaded lazily
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          // Chart library
          'charts-vendor': ['lightweight-charts'],
          // Animation libraries
          'motion-vendor': ['framer-motion', 'gsap'],
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})

