// Per-tab loading skeletons that mirror each tab's actual layout. The
// goal is "the surface is loading data" instead of "the app is broken
// somehow" — generic gray bars don't communicate either, but a
// skeleton shaped like the screener's six columns or the seasonality
// heatmap's twelve tiles tells the eye exactly what's coming.
//
// All variants share the same pulse animation; only the shape differs.

const Bar = ({ className = '' }) => (
    <div className={`bg-white/[0.04] rounded animate-pulse ${className}`} />
);

// Generic 5-row table skeleton. Used by the screener, watchlist, COT
// table, and anywhere else that loads tabular data.
export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
    <div className="border border-white/5 rounded-xl overflow-hidden">
        <div className="bg-white/[0.03] grid gap-4 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, i) => (
                <Bar key={i} className="h-3" />
            ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
            <div
                key={r}
                className="grid gap-4 px-4 py-3 border-t border-white/5"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
                {Array.from({ length: cols }).map((_, c) => (
                    <Bar key={c} className="h-4" />
                ))}
            </div>
        ))}
    </div>
);

// Seasonality calendar — 12 month tiles, varying tints to suggest a
// heatmap is loading.
export const CalendarSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-white/5 p-3 space-y-2">
                <Bar className="h-2 w-12" />
                <Bar className="h-6" />
                <Bar className="h-2 w-3/4" />
            </div>
        ))}
    </div>
);

// Backtester / Today dashboard — six stat tiles in a grid.
export const StatGridSkeleton = ({ tiles = 6 }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: tiles }).map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
                <Bar className="h-2 w-3/4" />
                <Bar className="h-8" />
                <Bar className="h-2 w-1/2" />
            </div>
        ))}
    </div>
);

// Equity / sparkline curve — single shaped path placeholder.
export const ChartSkeleton = ({ height = 240 }) => (
    <div
        className="bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center animate-pulse"
        style={{ height }}
    >
        <svg width="80%" height={Math.round(height * 0.6)} viewBox="0 0 100 40" preserveAspectRatio="none">
            <path
                d="M0 30 Q20 10, 40 20 T80 14 T100 22"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
            />
        </svg>
    </div>
);

// Settings / form-heavy pages — rows of label + input.
export const FormSkeleton = ({ rows = 4 }) => (
    <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Bar className="h-2 w-24" />
                <Bar className="h-9" />
            </div>
        ))}
    </div>
);

// Default fallback — soft logo loader for the dashboard's lazy Suspense
// boundary. Replaces the bare "Loading..." string.
export const RouteSkeleton = () => (
    <div className="flex items-center justify-center h-64 text-text-secondary">
        <span className="material-icons animate-spin text-3xl text-primary/60">progress_activity</span>
    </div>
);
