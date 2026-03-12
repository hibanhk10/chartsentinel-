import TrendChart from '../../components/ui/TrendChart'
import { useLivePrices } from '../../hooks/useLivePrices'

export function ForexWidget() {
    const { EURUSD } = useLivePrices()

    const price = EURUSD.price ? EURUSD.price.toFixed(4) : '...'
    const isPos = EURUSD.isPositive

    return (
        <div className="bg-black/80 border border-white/10 rounded-xl p-4 w-full h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-20 text-6xl font-bold font-display select-none pointer-events-none">FX</div>
            <div className="flex justify-between items-end mb-4 z-10">
                <div>
                    <h3 className="text-secondary text-sm font-semibold flex items-center gap-1.5">
                        EUR/USD
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    </h3>
                    <div className="text-2xl text-white font-mono">{price}</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${isPos ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    LIVE
                </div>
            </div>
            <div className="flex-grow relative z-10">
                <TrendChart height={120} color="#22c55e" data={[1.08, 1.082, 1.081, 1.085, 1.084, 1.088, 1.09, 1.092, 1.091, 1.094]} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 z-10">
                {['15m', '1H', '4H'].map(t => (
                    <div key={t} className="text-center text-xs text-secondary py-1 bg-white/5 rounded hover:bg-white/10 cursor-pointer transition-colors">{t}</div>
                ))}
            </div>
        </div>
    )
}
