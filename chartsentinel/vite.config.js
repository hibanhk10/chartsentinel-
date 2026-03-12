import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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

