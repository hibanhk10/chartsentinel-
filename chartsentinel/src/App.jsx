import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'
import CanvasWrapper from './components/three/CanvasWrapper'
import Hero from './sections/Hero/Hero'
import useExperienceStore from './store/useExperienceStore'
import { AuthProvider } from './contexts/AuthContext'

import Navbar from './components/ui/Navbar'
import WhatWeDo from './sections/WhatWeDo/WhatWeDo'
import Reports from './sections/Reports/Reports'
import News from './sections/News/News'
import Pricing from './sections/Pricing/Pricing'
import Process from './sections/Process/Process'
import WhyUs from './sections/WhyUs/WhyUs'
import Footer from './sections/Footer/Footer'

export default function App() {
  const setMouse = useExperienceStore((state) => state.setMouse)

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, smoothing: 0.7 })
    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    const handleMouseMove = (e) => {
      // Normalize mouse from -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      setMouse(x, y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      lenis.destroy()
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [setMouse])

  return (
    <AuthProvider>
      <main className="bg-background-dark text-white selection:bg-primary selection:text-white">
        <div className="fixed inset-0 z-0">
          <CanvasWrapper />
        </div>

        <Navbar />

        <div className="relative z-10 w-full">
          <Hero />
          <WhatWeDo />
          <Reports />
          <News />
          <Pricing />
          <Process />
          <WhyUs />
          <Footer />
        </div>
      </main>
    </AuthProvider>
  )
}
