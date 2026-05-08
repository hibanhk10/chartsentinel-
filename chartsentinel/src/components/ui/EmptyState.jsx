// Shared empty-state component. Replaces the dozen or so ad-hoc gray
// boxes scattered through the dashboard with a single look:
//   • Soft-tint icon at the top
//   • A short voice-y hed (max ~60 chars)
//   • Optional sub-line for context
//   • Optional primary CTA
//
// Voice notes for callers: write the hed like a human would say it
// out loud. "Watchlist is empty" beats "No items found." Avoid jargon
// in this layer — the user is here because they don't know the system
// yet.

const EmptyState = ({ icon = 'inbox', title, sub, action }) => (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
        <span className="material-icons text-4xl text-text-muted/60 mb-3">{icon}</span>
        <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
        {sub && <p className="text-sm text-text-secondary max-w-sm">{sub}</p>}
        {action && (
            <button
                onClick={action.onClick}
                className="mt-5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
                {action.label}
            </button>
        )}
    </div>
);

export default EmptyState;
