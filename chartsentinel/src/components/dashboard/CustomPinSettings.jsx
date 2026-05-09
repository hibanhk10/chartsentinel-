import { useState } from 'react'

// Curated cities so the user picks from a dropdown instead of hand-
// typing lat/lon. Geocoding live coordinates from a string is too
// much friction for a feature this small.
const CITIES = [
    { name: 'New York', lat: 40.71, lon: -74.01 },
    { name: 'San Francisco', lat: 37.77, lon: -122.42 },
    { name: 'Toronto', lat: 43.65, lon: -79.38 },
    { name: 'Mexico City', lat: 19.43, lon: -99.13 },
    { name: 'Buenos Aires', lat: -34.6, lon: -58.38 },
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Paris', lat: 48.86, lon: 2.35 },
    { name: 'Berlin', lat: 52.52, lon: 13.41 },
    { name: 'Madrid', lat: 40.42, lon: -3.7 },
    { name: 'Istanbul', lat: 41.01, lon: 28.98 },
    { name: 'Cairo', lat: 30.04, lon: 31.24 },
    { name: 'Johannesburg', lat: -26.2, lon: 28.04 },
    { name: 'Nairobi', lat: -1.29, lon: 36.82 },
    { name: 'Tehran', lat: 35.69, lon: 51.39 },
    { name: 'Dhaka', lat: 23.81, lon: 90.41 },
    { name: 'Bangkok', lat: 13.76, lon: 100.5 },
    { name: 'Jakarta', lat: -6.2, lon: 106.85 },
    { name: 'Manila', lat: 14.6, lon: 120.98 },
    { name: 'Seoul', lat: 37.57, lon: 126.98 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 },
    { name: 'Auckland', lat: -36.85, lon: 174.76 },
    { name: 'Caracas', lat: 10.49, lon: -66.88 },
    { name: 'Bogotá', lat: 4.71, lon: -74.07 },
    { name: 'Stockholm', lat: 59.33, lon: 18.07 },
    { name: 'Warsaw', lat: 52.23, lon: 21.01 },
]

const STORAGE_KEY = 'chartsentinel.globe.pin'

function loadPin() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export default function CustomPinSettings() {
    const initial = loadPin()
    const [city, setCity] = useState(() =>
        initial && CITIES.find((c) => c.name === initial.name) ? initial.name : CITIES[0].name,
    )
    const [keyword, setKeyword] = useState(initial?.keyword ?? '')
    const [tickers, setTickers] = useState((initial?.tickers ?? []).join(', '))
    const [saved, setSaved] = useState(false)

    const handleSave = (e) => {
        e.preventDefault()
        const target = CITIES.find((c) => c.name === city) || CITIES[0]
        const trimmedTickers = tickers
            .split(',')
            .map((t) => t.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, 6)
        const pin = {
            name: target.name,
            lat: target.lat,
            lon: target.lon,
            keyword: keyword.trim() || target.name,
            tickers: trimmedTickers,
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pin))
            setSaved(true)
            setTimeout(() => setSaved(false), 2400)
        } catch {
            /* private mode — best effort */
        }
    }

    const handleClear = () => {
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch {
            /* ignore */
        }
        setKeyword('')
        setTickers('')
        setSaved(false)
    }

    return (
        <form
            onSubmit={handleSave}
            className="space-y-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5 block">
                        City
                    </span>
                    <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-background-dark/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    >
                        {CITIES.map((c) => (
                            <option key={c.name} value={c.name} className="bg-surface-dark">
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5 block">
                        Keyword
                    </span>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="e.g. korea, election, copper"
                        className="w-full bg-background-dark/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                    />
                </label>
            </div>
            <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5 block">
                    Tickers exposed (optional, comma-separated)
                </span>
                <input
                    type="text"
                    value={tickers}
                    onChange={(e) => setTickers(e.target.value)}
                    placeholder="e.g. SPY, EURUSD=X, GLD"
                    className="w-full bg-background-dark/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                />
            </label>
            <p className="text-[11px] text-text-muted leading-relaxed">
                Pick a city, give it a keyword, and your custom pin will glow on the globe whenever
                a live wire mentions it. Refresh the dashboard after saving so the globe picks up
                your new pin.
            </p>
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary-dark transition-colors"
                >
                    Save pin
                </button>
                {initial && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-text-secondary text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                        Clear
                    </button>
                )}
                {saved && (
                    <span className="text-[10px] uppercase tracking-widest text-emerald-300">
                        Saved — refresh the dashboard
                    </span>
                )}
            </div>
        </form>
    )
}
