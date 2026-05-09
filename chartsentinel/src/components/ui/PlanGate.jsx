import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { hasFeature, requiredPlanFor, planLabel } from '../../lib/plan'

// Wraps content that's restricted to a higher tier. If the user has the
// feature, render children verbatim. Otherwise show an upgrade card with
// a CTA to the funnel.
//
// Usage:
//   <PlanGate feature="smart-money">
//     <SmartMoneyPanel />
//   </PlanGate>

export default function PlanGate({ feature, children, title, description }) {
    const { user } = useAuth()

    if (hasFeature(user, feature)) return children

    const required = requiredPlanFor(user, feature)
    const requiredLabel = planLabel(required)

    return (
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-5">
                <span className="material-icons text-primary text-sm">lock</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                    {requiredLabel} feature
                </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {title || 'Upgrade to unlock'}
            </h3>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
                {description || `This is a ${requiredLabel} feature. Upgrade to access it on your account.`}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <Link
                    to="/funnel"
                    className="px-6 py-3 rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
                >
                    Upgrade to {requiredLabel}
                </Link>
                <Link
                    to="/#pricing"
                    className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                >
                    Compare plans
                </Link>
            </div>
        </div>
    )
}
