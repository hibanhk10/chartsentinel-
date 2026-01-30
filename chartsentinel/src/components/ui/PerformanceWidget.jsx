import { motion } from 'framer-motion'
import TrendChart from './TrendChart'

export default function PerformanceWidget() {
    return (
        <div className="glass-card rounded-2xl p-6 w-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-sm text-secondary font-semibold">Average Client Returns</h3>
                    <div className="text-3xl font-bold text-green-400 font-mono">+24.5%</div>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                    YTD
                </div>
            </div>

            <TrendChart
                height={80}
                color="#22c55e"
                data={[10, 12, 15, 14, 18, 20, 19, 22, 24, 24.5]}
            />

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                <div>
                    <div className="text-xs text-secondary">Win Rate</div>
                    <div className="text-lg font-bold text-white">68%</div>
                </div>
                <div>
                    <div className="text-xs text-secondary">Avg Trade</div>
                    <div className="text-lg font-bold text-white">+3.2%</div>
                </div>
                <div>
                    <div className="text-xs text-secondary">Signals</div>
                    <div className="text-lg font-bold text-white">450+</div>
                </div>
            </div>
        </div>
    )
}
