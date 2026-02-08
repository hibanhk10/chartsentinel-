import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Lenis from '@studio-freight/lenis'
import CanvasWrapper from './components/three/CanvasWrapper'
import useExperienceStore from './store/useExperienceStore'
import { AuthProvider } from './contexts/AuthContext'

import Navbar from './components/ui/Navbar'
import HomePage from './pages/HomePage'
import ContactPage from './pages/ContactPage'
import DashboardPage from './pages/DashboardPage'
import SalesFunnelPage from './pages/SalesFunnelPage'

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
      <Router>
        <main className="bg-background-dark text-white selection:bg-primary selection:text-white">
          <div className="fixed inset-0 z-0">
            <CanvasWrapper />
          </div>

          <Navbar />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/funnel" element={<SalesFunnelPage />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  )
}
