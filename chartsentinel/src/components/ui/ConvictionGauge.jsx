import { useMemo } from 'react';
import { motion } from 'framer-motion';

// Buy-vs-sell dollar share rendered as a half-arc gauge. 100 = pure buying,
// 0 = pure selling, 50 = balanced. Bucket labels match the granularity
// retail readers actually use; nothing in here is a forecast — it's just a
// summary statistic of the trades passed in.
function bucket(score) {
  if (score >= 70) return { label: 'EXTREME BULLISH', tone: 'text-emerald-300' };
  if (score >= 55) return { label: 'BULLISH', tone: 'text-emerald-300' };
  if (score >= 45) return { label: 'NEUTRAL', tone: 'text-amber-300' };
  if (score >= 30) return { label: 'BEARISH', tone: 'text-red-300' };
  return { label: 'EXTREME BEARISH', tone: 'text-red-300' };
}

const fmtMoney = (n) => {
  if (!n) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

export default function ConvictionGauge({ trades = [], title = 'C-Suite Conviction' }) {
  const stats = useMemo(() => {
    const buyValue = trades.filter((t) => t.type === 'Buy').reduce((s, t) => s + t.value, 0);
    const sellValue = trades.filter((t) => t.type === 'Sell').reduce((s, t) => s + t.value, 0);
    const total = buyValue + sellValue;
    const score = total > 0 ? (buyValue / total) * 100 : 50;
    return { buyValue, sellValue, total, score, ...bucket(score) };
  }, [trades]);

  // Half-arc geometry: r=44, circumference of full circle = 2πr ≈ 276.46.
  // Half-circle = 138.23. Filled portion scales linearly with score.
  const fullArc = 138.23;
  const filled = (stats.score / 100) * fullArc;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
          {title}
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-bold ${stats.tone}`}>
          {stats.label}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-48 h-24">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <defs>
              <linearGradient id="conviction-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path
              d="M 6 50 A 44 44 0 0 1 94 50"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <motion.path
              d="M 6 50 A 44 44 0 0 1 94 50"
              fill="none"
              stroke="url(#conviction-grad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={fullArc}
              initial={{ strokeDashoffset: fullArc }}
              animate={{ strokeDashoffset: fullArc - filled }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <div className="text-3xl font-bold text-white tabular-nums">
              {Math.round(stats.score)}
            </div>
            <div className="text-[9px] text-text-muted uppercase tracking-widest">
              conviction
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 w-full mt-4 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted">Buys</div>
            <div className="text-emerald-300 font-bold tabular-nums">
              {fmtMoney(stats.buyValue)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted">Sells</div>
            <div className="text-red-300 font-bold tabular-nums">
              {fmtMoney(stats.sellValue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
