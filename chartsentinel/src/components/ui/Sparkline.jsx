// Minimalist inline price chart. Renders a single SVG path over the
// supplied numeric series with no axes / labels / interactivity — its
// job is to give the eye a sense of trend at a glance, not to replace
// the real chart elsewhere.
//
// Used in screener rows + ticker pages. Width / height are caller-set
// so the same primitive works in a 100×24 row cell and a 320×80 hero
// strip without us having to ship two variants.

const Sparkline = ({
    data,
    width = 100,
    height = 24,
    stroke = 'currentColor',
    strokeWidth = 1.5,
    fill = 'none',
    className = '',
    ariaLabel,
}) => {
    if (!data || data.length < 2) {
        // Render an empty box so the table layout doesn't collapse on
        // a row with missing history.
        return (
            <svg
                width={width}
                height={height}
                className={className}
                aria-hidden="true"
            />
        );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);

    // Single-pass path build. Round to 1 decimal — at 100×24 nobody
    // notices subpixel precision and the smaller string compresses
    // better over the wire.
    let d = '';
    for (let i = 0; i < data.length; i++) {
        const x = (i * stepX).toFixed(1);
        const y = (height - ((data[i] - min) / range) * height).toFixed(1);
        d += i === 0 ? `M${x} ${y}` : ` L${x} ${y}`;
    }

    // Direction tint: last point above first → green, below → red,
    // flat → muted. Caller can override via `stroke` prop.
    let resolvedStroke = stroke;
    if (stroke === 'currentColor') {
        if (data[data.length - 1] > data[0]) resolvedStroke = 'rgb(110 231 183)';      // emerald-300
        else if (data[data.length - 1] < data[0]) resolvedStroke = 'rgb(252 165 165)'; // red-300
        else resolvedStroke = 'rgb(148 163 184)';                                       // slate-400
    }

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            role={ariaLabel ? 'img' : undefined}
            aria-label={ariaLabel}
            aria-hidden={ariaLabel ? undefined : true}
        >
            <path d={d} fill={fill} stroke={resolvedStroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export default Sparkline;
