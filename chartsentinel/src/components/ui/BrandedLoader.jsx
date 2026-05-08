// Branded full-screen loader. Replaces the bare "Loading..." string
// that used to flash during the auth check + onboarding gate. The SVG
// is intentionally simple: a single chart-line glyph that draws itself
// in via stroke-dasharray, then a soft pulse on the wordmark. About
// 600ms of motion total.

const BrandedLoader = ({ label = 'Loading' }) => (
    <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center text-white">
        <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            className="mb-4"
            role="img"
            aria-label="ChartSentinel"
        >
            <defs>
                <linearGradient id="cs-line" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#d946ef" />
                    <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="30" stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none" />
            <path
                d="M8 44 L20 32 L28 38 L40 22 L56 30"
                stroke="url(#cs-line)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                    strokeDasharray: 100,
                    strokeDashoffset: 100,
                    animation: 'cs-draw 700ms ease-out forwards, cs-pulse 1.6s ease-in-out 700ms infinite',
                }}
            />
        </svg>
        <span className="text-xs font-mono tracking-widest uppercase text-text-muted animate-pulse">
            {label}
        </span>
        <style>{`
            @keyframes cs-draw {
                to { stroke-dashoffset: 0; }
            }
            @keyframes cs-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `}</style>
    </div>
);

export default BrandedLoader;
