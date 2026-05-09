// Plan-tier source of truth.
//
// The PLANS constant matches the matrix shipped on the homepage
// (PlanComparison + Pricing) and the funnel (Step3Pricing). If you
// reorganise tier capabilities here, update those three files too.
//
// Until Stripe is wired, plan lives in localStorage on the user object —
// gating is therefore strictly UX, not enforcement. Anyone with browser
// devtools could flip their tier locally; that's accepted because nothing
// here actually charges money yet.

export const PLAN_ORDER = ['free', 'pro', 'ultimate']

const PLAN_LABELS = {
    free: 'Free',
    pro: 'Pro',
    ultimate: 'Ultimate',
}

// Each feature is keyed by a stable id and declares the minimum plan
// required to unlock it. The Sidebar reads `tabs[*].requires`; panels
// inside locked tabs may also wrap individual sub-features in
// <PlanGate feature="..."/>.
export const FEATURES = {
    // Tier-0 (free) features — listed for completeness, never gated
    'home': 'free',
    'mood': 'free',
    'watchlist': 'free',
    'reports': 'free',
    'news': 'free',
    'settings': 'free',
    'about': 'free',
    'contact': 'free',
    'referrals': 'free',

    // Pro tier
    'signals': 'pro',
    'terminal': 'pro',
    'backtester': 'pro',
    'seasonality-calendar': 'pro',
    'portfolio': 'pro',
    'alert-builder': 'pro',
    'intel': 'pro',
    'catalysts': 'pro',
    'journal': 'pro',
    'briefing': 'pro',
    'idea-cards': 'pro',
    'networking': 'pro',
    'conviction': 'pro',
    'mentor-match': 'pro',
    'custom-alerts-telegram': 'pro',
    'custom-alerts-webhook': 'pro',
    'globe-drilldown': 'pro',
    'globe-filter': 'pro',
    'globe-custom-pin': 'pro',

    // Ultimate tier
    'smart-money': 'ultimate',
    'anomalies': 'ultimate',
    'risk-posture': 'ultimate',
    'macro-themes': 'ultimate',
    'scenarios': 'ultimate',
    'interrogation': 'ultimate',
    'war-rooms': 'ultimate',
    'coaching': 'ultimate',
    'custom-signal-weights': 'ultimate',
    'priority-support': 'ultimate',
    'early-access': 'ultimate',
    'globe-autopan': 'ultimate',
    'globe-time-scrubber': 'ultimate',
}

// Watchlist size caps mirror the homepage matrix.
export const WATCHLIST_LIMITS = {
    free: 5,
    pro: 25,
    ultimate: Infinity,
}

export function getUserPlan(user) {
    if (!user) return 'free'
    if (PLAN_ORDER.includes(user.plan)) return user.plan
    // Legacy fallback: pre-funnel users only had the isPaid boolean.
    if (user.isPaid) return 'pro'
    return 'free'
}

export function planLabel(plan) {
    return PLAN_LABELS[plan] ?? 'Free'
}

// True if `userPlan` is at or above `requiredPlan`. Order is
// free < pro < ultimate.
export function planAtLeast(userPlan, requiredPlan) {
    return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(requiredPlan)
}

// Convenience: check a feature by id.
export function hasFeature(user, featureId) {
    const required = FEATURES[featureId]
    if (!required) return true // unmapped feature = ungated
    return planAtLeast(getUserPlan(user), required)
}

// What plan would unlock this feature? Returns null if already unlocked
// or the feature isn't tier-gated.
export function requiredPlanFor(user, featureId) {
    const required = FEATURES[featureId]
    if (!required) return null
    if (hasFeature(user, featureId)) return null
    return required
}

export function watchlistLimit(user) {
    return WATCHLIST_LIMITS[getUserPlan(user)] ?? WATCHLIST_LIMITS.free
}
