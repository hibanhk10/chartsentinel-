import { useMemo, useState } from 'react';
import { motion as Motion } from 'framer-motion';

// Stylized world map showing approximate public locations of community
// members. Coordinates are city-level only — no PII, no IP geolocation,
// no precise location. Members appear here only after opting in.
//
// The base map is rendered as a set of soft ellipses approximating
// continents in equirectangular projection. We avoid pulling in a
// heavy mapping library because we want a clean Apple-Maps-flavored
// silhouette rather than a fully zoomable raster map, and adding a
// dependency for ~600 lines of decorative SVG is not worth it.

const VIEW_W = 1000;
const VIEW_H = 500;

// Equirectangular projection: longitude/latitude → x/y on the viewbox.
// Wrapped here so the same helper places the continent ellipse centers
// and the member pins, keeping them visually aligned.
const project = (lat, lng) => ({
    x: ((lng + 180) / 360) * VIEW_W,
    y: ((90 - lat) / 180) * VIEW_H,
});

// Continents as overlapping ellipses defined in projected pixel space.
// Hand-tuned so the silhouette reads as Earth without any external
// dataset. Order matters slightly — later ellipses paint over earlier
// ones, so larger landmasses come first.
const CONTINENTS = [
    // North America
    { cx: 215, cy: 175, rx: 75, ry: 70 },
    { cx: 255, cy: 240, rx: 22, ry: 45 },
    // Greenland
    { cx: 440, cy: 95, rx: 28, ry: 30 },
    // South America
    { cx: 305, cy: 310, rx: 38, ry: 65 },
    { cx: 320, cy: 380, rx: 18, ry: 25 },
    // Europe
    { cx: 510, cy: 165, rx: 45, ry: 32 },
    // Africa
    { cx: 540, cy: 285, rx: 58, ry: 75 },
    // Asia
    { cx: 700, cy: 200, rx: 115, ry: 75 },
    { cx: 765, cy: 265, rx: 35, ry: 30 }, // India / South Asia
    { cx: 825, cy: 280, rx: 25, ry: 22 }, // SE Asia
    // Oceania
    { cx: 830, cy: 365, rx: 42, ry: 25 },
];

// Curated demo roster — anonymized handles and city-level coordinates.
// Replace with `GET /networking/members/public` (opt-in roster) once
// the backend route exists; the schema mirrors what this component
// already renders.
const SAMPLE_MEMBERS = [
    { handle: 'alpha-quant', city: 'New York, US',     lat: 40.71,  lng: -74.00, role: 'Quant' },
    { handle: 'bay-trader',  city: 'San Francisco, US', lat: 37.77,  lng: -122.42, role: 'Equities' },
    { handle: 'maple-desk',  city: 'Toronto, CA',      lat: 43.65,  lng: -79.38, role: 'FX' },
    { handle: 'thames-pm',   city: 'London, UK',       lat: 51.51,  lng: -0.13,  role: 'Macro' },
    { handle: 'alpine-vol',  city: 'Zurich, CH',       lat: 47.37,  lng: 8.54,   role: 'Vol' },
    { handle: 'frankfurt-1', city: 'Frankfurt, DE',    lat: 50.11,  lng: 8.68,   role: 'Rates' },
    { handle: 'soko-trader', city: 'Lagos, NG',        lat: 6.52,   lng: 3.38,   role: 'Crypto' },
    { handle: 'mumbai-fx',   city: 'Mumbai, IN',       lat: 19.08,  lng: 72.88,  role: 'FX' },
    { handle: 'sg-systems',  city: 'Singapore, SG',    lat: 1.35,   lng: 103.82, role: 'Systematic' },
    { handle: 'tokyo-prop',  city: 'Tokyo, JP',        lat: 35.68,  lng: 139.69, role: 'Prop' },
    { handle: 'sydney-desk', city: 'Sydney, AU',       lat: -33.87, lng: 151.21, role: 'Commodities' },
    { handle: 'paulista-1',  city: 'São Paulo, BR',    lat: -23.55, lng: -46.63, role: 'EM' },
    { handle: 'dxb-prop',    city: 'Dubai, AE',        lat: 25.20,  lng: 55.27,  role: 'Energy' },
    { handle: 'hk-arb',      city: 'Hong Kong, HK',    lat: 22.32,  lng: 114.17, role: 'Arb' },
];

const MemberMap = ({ members = SAMPLE_MEMBERS }) => {
    const [hovered, setHovered] = useState(null);

    const projected = useMemo(
        () => members.map((m) => ({ ...m, ...project(m.lat, m.lng) })),
        [members]
    );

    const activeMember = hovered
        ? projected.find((m) => m.handle === hovered)
        : null;

    return (
        <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-b from-[#0b1220] to-[#070a14]">
            {/* Header strip */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/40 to-transparent">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-primary text-base">public</span>
                    <span className="text-[11px] uppercase tracking-widest font-bold text-white">
                        Community Map
                    </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#d946ef]" />
                        {projected.length} members visible
                    </span>
                </div>
            </div>

            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="w-full h-full block"
                role="img"
                aria-label="World map of community members"
            >
                <defs>
                    <radialGradient id="memberMapBg" cx="50%" cy="40%" r="80%">
                        <stop offset="0%" stopColor="#0e172a" />
                        <stop offset="100%" stopColor="#050810" />
                    </radialGradient>
                    <linearGradient id="memberMapLand" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(148,163,184,0.18)" />
                        <stop offset="100%" stopColor="rgba(148,163,184,0.06)" />
                    </linearGradient>
                    <radialGradient id="memberPin" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#f0abfc" />
                        <stop offset="60%" stopColor="#d946ef" />
                        <stop offset="100%" stopColor="#a21caf" />
                    </radialGradient>
                </defs>

                {/* Map base */}
                <rect width={VIEW_W} height={VIEW_H} fill="url(#memberMapBg)" />

                {/* Subtle latitude/longitude grid */}
                <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.5">
                    {[...Array(9)].map((_, i) => (
                        <line key={`h${i}`} x1={0} x2={VIEW_W} y1={(i + 1) * (VIEW_H / 10)} y2={(i + 1) * (VIEW_H / 10)} />
                    ))}
                    {[...Array(11)].map((_, i) => (
                        <line key={`v${i}`} y1={0} y2={VIEW_H} x1={(i + 1) * (VIEW_W / 12)} x2={(i + 1) * (VIEW_W / 12)} />
                    ))}
                </g>

                {/* Continents */}
                <g>
                    {CONTINENTS.map((c, i) => (
                        <ellipse
                            key={i}
                            cx={c.cx}
                            cy={c.cy}
                            rx={c.rx}
                            ry={c.ry}
                            fill="url(#memberMapLand)"
                            stroke="rgba(148,163,184,0.18)"
                            strokeWidth="0.6"
                        />
                    ))}
                </g>

                {/* Member pins */}
                <g>
                    {projected.map((m) => {
                        const isActive = hovered === m.handle;
                        return (
                            <g
                                key={m.handle}
                                transform={`translate(${m.x} ${m.y})`}
                                onMouseEnter={() => setHovered(m.handle)}
                                onMouseLeave={() => setHovered(null)}
                                onFocus={() => setHovered(m.handle)}
                                onBlur={() => setHovered(null)}
                                tabIndex={0}
                                style={{ cursor: 'pointer', outline: 'none' }}
                            >
                                {/* Pulse */}
                                <Motion.circle
                                    r="6"
                                    fill="rgba(217,70,239,0.4)"
                                    animate={{ r: [6, 14, 6], opacity: [0.6, 0, 0.6] }}
                                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                                />
                                <circle r="4" fill="url(#memberPin)" />
                                <circle r="1.6" fill="#fff" />
                                {isActive && (
                                    <circle
                                        r="9"
                                        fill="none"
                                        stroke="#f0abfc"
                                        strokeWidth="1"
                                        opacity="0.9"
                                    />
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>

            {/* Tooltip — overlaid in HTML so it can carry richer text styling
                than what raw SVG <text> gives us. */}
            {activeMember && (
                <Motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-full mb-2"
                    style={{
                        left: `${(activeMember.x / VIEW_W) * 100}%`,
                        top: `${(activeMember.y / VIEW_H) * 100}%`,
                    }}
                >
                    <div className="relative px-3 py-2 rounded-lg bg-black/85 border border-white/10 backdrop-blur-md shadow-xl whitespace-nowrap">
                        <p className="text-[11px] font-bold text-white">@{activeMember.handle}</p>
                        <p className="text-[10px] text-text-muted">{activeMember.city} · {activeMember.role}</p>
                        <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-black/85 border-r border-b border-white/10" />
                    </div>
                </Motion.div>
            )}

            {/* Privacy footer */}
            <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-2.5 bg-gradient-to-t from-black/60 to-transparent">
                <span className="text-[9px] uppercase tracking-widest text-text-muted">
                    City-level · opt-in only · no PII
                </span>
                <span className="text-[9px] uppercase tracking-widest text-text-muted">
                    Sample roster
                </span>
            </div>
        </div>
    );
};

export default MemberMap;
