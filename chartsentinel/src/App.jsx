import { useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom'
import Lenis from '@studio-freight/lenis'
import CanvasWrapper from './components/three/CanvasWrapper'
import useExperienceStore from './store/useExperienceStore'
import { AuthProvider } from './contexts/AuthContext'
import { trackPageview } from './lib/analytics'

import Navbar from './components/ui/Navbar'
import HomePage from './pages/HomePage'
import ContactPage from './pages/ContactPage'
import DashboardPage from './pages/DashboardPage'
import SalesFunnelPage from './pages/SalesFunnelPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

// Drives PostHog $pageview events off the router. No-ops when PostHog isn't
// configured — `trackPageview` guards internally on the enabled flag.
function RouteChangeTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageview(location.pathname + location.search)
  }, [location])
  return null
}

// Dev-only: a route that throws synchronously so we can confirm Sentry is
// catching client errors. Kept out of the prod bundle by import.meta.env.DEV.
function DebugSentry() {
  throw new Error('Sentry test from /debug-sentry (frontend)')
}

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
          <RouteChangeTracker />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/funnel" element={<SalesFunnelPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {import.meta.env.DEV && (
              <Route path="/debug-sentry" element={<DebugSentry />} />
            )}
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  )
}
