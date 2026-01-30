import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useRef } from 'react'

export default function AnimatedCounter({ value, suffix = '', duration = 2 }) {
    const ref = useRef(null)
    const motionValue = useMotionValue(0)
    const springValue = useSpring(motionValue, { duration: duration * 1000 })
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    useEffect(() => {
        if (isInView) {
            motionValue.set(parseFloat(value))
        }
    }, [motionValue, isInView, value])

    useEffect(() => {
        springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = latest.toFixed(0) + suffix
            }
        })
    }, [springValue, suffix])

    return <span ref={ref}>0{suffix}</span>
}
