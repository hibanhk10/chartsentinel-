/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion'
import { GridPattern } from '../../components/ui/Patterns'

export default function SystemArchitecture() {
    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden flex items-center justify-center border border-white/10 rounded-3xl">
            <GridPattern className="absolute inset-0 text-slate-800 opacity-30" />

            {/* Central Core */}
            <div className="relative z-10 w-32 h-32 flex items-center justify-center">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], boxShadow: ['0 0 20px rgba(217, 70, 239, 0.2)', '0 0 50px rgba(217, 70, 239, 0.6)', '0 0 20px rgba(217, 70, 239, 0.2)'] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-full h-full rounded-full border-2 border-primary/50 bg-primary/10 flex items-center justify-center backdrop-blur-md"
                >
                    <span className="material-icons text-4xl text-primary animate-pulse">hub</span>
                </motion.div>

                {/* Orbiting Nodes */}
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-4 h-4"
                        animate={{ rotate: 360 }}
                        style={{ translateX: '-50%', translateY: '-50%' }} // Center pivot
                        initial={{ rotate: i * 120 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan]" style={{ transform: `translateX(${80}px)` }} />
                    </motion.div>
                ))}
            </div>

            {/* Data Streams (Simple SVG Overlay) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <motion.path
                    d="M 0 500 Q 300 300 600 500"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.path
                    d="M 600 100 Q 300 300 0 100"
                    fill="none"
                    stroke="#d946ef"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
            </svg>

            {/* Floating Badges */}
            <motion.div
                className="absolute top-10 left-10 bg-black/80 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
            >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-300">Ingesting Source A</span>
            </motion.div>

            <motion.div
                className="absolute bottom-20 right-10 bg-black/80 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, delay: 1 }}
            >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-mono text-slate-300">Processing v2.0</span>
            </motion.div>
        </div>
    )
}
