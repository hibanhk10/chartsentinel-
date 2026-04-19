import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import { initSentry, Sentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'
import { captureReferralFromUrl } from './lib/referral'

// Must run before the React tree mounts so the ErrorBoundary below is
// wired to a live Sentry instance.
initSentry()
initAnalytics()

// Persist ?ref= in localStorage on first landing so the attribution
// survives a tabbed-away visitor who eventually signs up later.
captureReferralFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace' }}>
          <h2 style={{ marginTop: 0 }}>Something broke.</h2>
          <p style={{ opacity: 0.8 }}>{error?.message || 'Unknown error.'}</p>
          <button
            onClick={resetError}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#1f2937',
              color: '#e5e7eb',
              border: '1px solid #374151',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
)
