import { useEffect, useRef, useState } from 'react';

// Counts from the previous value to the new value over `duration` ms,
// using requestAnimationFrame so it respects the user's monitor refresh
// rate. Render output is whatever `format(value)` returns — so a caller
// passing fmtMoney gets "$1,234.56" tweens, a caller passing fmtPercent
// gets "+2.50%" tweens, etc.
//
// Why not framer-motion? It's already in the bundle but a 40-line
// custom hook is cheaper than mounting a motion-value graph for every
// number on the page, and it gives us full control over the easing and
// formatting boundary.

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const AnimatedNumber = ({
    value,
    format = (v) => String(v),
    duration = 600,
    className,
}) => {
    const [display, setDisplay] = useState(value ?? 0);
    const fromRef = useRef(value ?? 0);
    const startRef = useRef(0);
    const rafRef = useRef(null);

    useEffect(() => {
        // Null/undefined doesn't animate — render the placeholder
        // immediately. Same for NaN.
        if (value == null || Number.isNaN(value)) {
            setDisplay(value);
            return;
        }

        // Honour reduced-motion: skip the tween entirely. Counting numbers
        // for a vestibular-sensitive user would be hostile.
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            setDisplay(value);
            fromRef.current = value;
            return;
        }

        const from = fromRef.current ?? 0;
        const to = value;
        if (from === to) return;

        startRef.current = performance.now();
        const tick = (now) => {
            const elapsed = now - startRef.current;
            const t = Math.min(1, elapsed / duration);
            const eased = easeOutCubic(t);
            const next = from + (to - from) * eased;
            setDisplay(next);
            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = to;
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [value, duration]);

    return <span className={className}>{format(display)}</span>;
};

export default AnimatedNumber;
