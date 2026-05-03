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
    // 1300 KB threshold accommodates the three-vendor chunk (three.js +
    // R3F + drei + postprocessing land at ~1.2 MB combined, already
    // lazy-loaded and HTML-modulepreload-stripped for non-marketing
    // routes). Our own application code stays well below this — the
    // current next-largest chunk is the entry bundle at ~400 KB — so a
    // real future regression still surfaces above the warning line.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy 3D / rendering libraries → separate chunk, loaded lazily
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          // Chart library
          'charts-vendor': ['lightweight-charts'],
          // Animation libraries
          'motion-vendor': ['framer-motion', 'gsap'],
          // Rich-text editor (admin-only). Pulling TipTap into its own
          // chunk shrinks the Admin route from ~400 KB to a thin wrapper
          // and lets TipTap cache separately, so an admin returning later
          // doesn't re-download it on every unrelated Admin code change.
          'tiptap-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-link',
            '@tiptap/extension-image',
          ],
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})

