import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'

export default function TrendChart({ data, color = "#d946ef", height = 60 }) {
    // Generate random points once if not provided
    const [points] = useState(() => {
        if (data) return data
        return Array.from({ length: 20 }, () => Math.floor(Math.random() * 50) + 20)
    })

    // SVG Path generation
    const pathData = useMemo(() => {
        const pointsArray = data || points

        const maxVal = Math.max(...pointsArray)
        const minVal = Math.min(...pointsArray)
        const norm = (val) => ((val - minVal) / (maxVal - minVal)) * height

        return pointsArray.map((p, i) => {
            const x = (i / (pointsArray.length - 1)) * 100
            const y = height - norm(p)
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')
    }, [data, points, height])

    return (
        <div className="w-full relative overflow-hidden" style={{ height }}>
            <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Gradient definition */}
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area Fill */}
                <motion.path
                    d={`${pathData} L 100 ${height} L 0 ${height} Z`}
                    fill="url(#gradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                />

                {/* Line Stroke */}
                <motion.path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />
            </svg>
        </div>
    )
}
