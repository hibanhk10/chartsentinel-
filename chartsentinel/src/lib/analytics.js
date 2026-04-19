import posthog from 'posthog-js'

// PostHog scaffold. No-ops until VITE_POSTHOG_KEY is set in .env — so there's
// zero network traffic or bundle impact locally until the account exists.

let enabled = false

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    // Privacy-friendly defaults for a finance product — we want funnels,
    // not surveillance. Users can opt into session recording later.
    capture_pageview: false, // we drive pageviews manually from the router
    autocapture: true,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
  })

  enabled = true
}

// Call from a react-router listener when the location changes. Guards on
// `enabled` so the PostHog SDK is never touched without a real key.
export function trackPageview(path) {
  if (!enabled) return
  posthog.capture('$pageview', { $current_url: window.location.origin + path })
}

// Thin wrappers so product code never imports posthog-js directly.
export function identify(userId, properties) {
  if (!enabled) return
  posthog.identify(userId, properties)
}

export function track(event, properties) {
  if (!enabled) return
  posthog.capture(event, properties)
}

export function reset() {
  if (!enabled) return
  posthog.reset()
}
