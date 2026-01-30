// Feature visuals for the Why Us section

export function ReportCardVisual() {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 w-full mt-4">
            <div className="flex gap-2 mb-2">
                <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">PDF</div>
                <div className="flex-1 space-y-1">
                    <div className="h-2 w-3/4 bg-white/20 rounded"></div>
                    <div className="h-2 w-1/2 bg-white/10 rounded"></div>
                </div>
            </div>
            <div className="h-16 bg-black/20 rounded p-2 text-[10px] text-secondary font-mono overflow-hidden">
                Analyzing market structure...<br />
                Trend bullish {'>'} 42k...<br />
                Key resistance broken...
            </div>
        </div>
    )
}

export function ActionButtonVisual() {
    return (
        <div className="flex gap-4 mt-6 justify-center">
            <button className="px-6 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 transition-colors text-sm font-bold">
                BUY
            </button>
            <button className="px-6 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors text-sm font-bold">
                SELL
            </button>
        </div>
    )
}

export function TimelineVisual() {
    return (
        <div className="mt-4 flex justify-between items-center relative h-8 w-3/4 mx-auto">
            {/* Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2"></div>
            {/* Points */}
            <div className="absolute top-1/2 left-0 w-3 h-3 rounded-full bg-primary -translate-y-1/2 border border-black shadow"></div>
            <div className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-slate-700 -translate-y-1/2 border border-black"></div>
            <div className="absolute top-1/2 right-0 w-3 h-3 rounded-full bg-slate-700 -translate-y-1/2 border border-black"></div>
        </div>
    )
}

export function ContextVisual() {
    return (
        <div className="mt-4 relative bg-black/40 rounded-lg p-3 border border-white/10 w-full">
            <div className="flex items-center gap-2 mb-2">
                <span className="material-icons text-yellow-500 text-sm">warning</span>
                <span className="text-xs font-bold text-yellow-500">Volatile</span>
            </div>
            <p className="text-[10px] text-secondary leading-tight">
                "CPI Data release caused 5% spike used by..."
            </p>
            {/* Tooltip Arrow */}
            <div className="absolute -top-1 left-4 w-2 h-2 bg-black/40 border-t border-l border-white/10 rotate-45 transform -translate-y-1/2"></div>
        </div>
    )
}
