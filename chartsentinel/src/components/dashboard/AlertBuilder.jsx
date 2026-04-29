import { useState } from 'react';

// Multi-Condition Alert Builder — compose alerts that fire when an
// AND-stack of conditions is met (price thresholds, composite score,
// threat-matrix score, volume z-score). Persisted in localStorage for
// now; the production version will POST to the backend so a cron job
// can evaluate them server-side and route notifications.

const FIELDS = [
    { id: 'price',    label: 'Price',           example: '70000' },
    { id: 'pct1d',    label: '% change (1d)',   example: '5' },
    { id: 'composite', label: 'Composite score', example: '1.5' },
    { id: 'threat',   label: 'Threat (region)', example: '60' },
    { id: 'rsi',      label: 'RSI (14d)',       example: '70' },
    { id: 'volZ',     label: 'Volume z-score',  example: '3' },
];

const OPERATORS = [
    { id: 'gt',  label: '>'  },
    { id: 'gte', label: '≥' },
    { id: 'lt',  label: '<'  },
    { id: 'lte', label: '≤' },
    { id: 'eq',  label: '='  },
];

const STORAGE_KEY = 'cs.alerts.v1';

function loadAlerts() {
    try {
        const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}

function saveAlerts(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const blankCondition = () => ({ id: crypto.randomUUID?.() || String(Math.random()), field: 'price', operator: 'gt', value: '' });

const DashboardAlertBuilder = () => {
    // Lazy-init from localStorage so we don't trigger a setState-in-effect
    // cascade. The function form runs once at mount, on first render.
    const [alerts, setAlerts] = useState(loadAlerts);
    const [name, setName] = useState('');
    const [ticker, setTicker] = useState('');
    const [conditions, setConditions] = useState([blankCondition()]);
    const [feedback, setFeedback] = useState(null);

    const addCondition = () => setConditions((p) => [...p, blankCondition()]);
    const removeCondition = (id) =>
        setConditions((p) => (p.length === 1 ? p : p.filter((c) => c.id !== id)));
    const updateCondition = (id, key, value) =>
        setConditions((p) => p.map((c) => (c.id === id ? { ...c, [key]: value } : c)));

    const handleSave = () => {
        if (!name.trim() || !ticker.trim()) {
            setFeedback({ type: 'error', message: 'Name and ticker are required.' });
            return;
        }
        if (conditions.some((c) => c.value === '' || Number.isNaN(Number(c.value)))) {
            setFeedback({ type: 'error', message: 'All conditions need a numeric value.' });
            return;
        }
        const next = [
            ...alerts,
            {
                id: crypto.randomUUID?.() || String(Date.now()),
                name: name.trim(),
                ticker: ticker.trim().toUpperCase(),
                conditions: conditions.map((c) => ({ ...c, value: Number(c.value) })),
                createdAt: new Date().toISOString(),
                active: true,
            },
        ];
        setAlerts(next);
        saveAlerts(next);
        setName('');
        setTicker('');
        setConditions([blankCondition()]);
        setFeedback({ type: 'success', message: 'Alert saved.' });
    };

    const toggleActive = (id) => {
        const next = alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
        setAlerts(next);
        saveAlerts(next);
    };

    const removeAlert = (id) => {
        const next = alerts.filter((a) => a.id !== id);
        setAlerts(next);
        saveAlerts(next);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Alert Builder
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Compose your trigger.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Stack conditions across price, composite score, threat-matrix region,
                    and momentum metrics. The alert fires only when every condition is true
                    at the same time.
                </p>
            </header>

            <section className="bg-surface-dark border border-white/5 rounded-2xl p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                            Alert name
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. BTC breakout + APAC tail"
                            maxLength={64}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                            Ticker / region
                        </label>
                        <input
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            placeholder="BTC, NDX, APAC, …"
                            maxLength={16}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Conditions
                    </label>
                    <div className="space-y-2">
                        {conditions.map((c, idx) => (
                            <div key={c.id} className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold w-8">
                                    {idx === 0 ? 'IF' : 'AND'}
                                </span>
                                <select
                                    value={c.field}
                                    onChange={(e) => updateCondition(c.id, 'field', e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-white"
                                >
                                    {FIELDS.map((f) => (
                                        <option key={f.id} value={f.id} className="bg-surface-dark">
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={c.operator}
                                    onChange={(e) => updateCondition(c.id, 'operator', e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-white"
                                >
                                    {OPERATORS.map((o) => (
                                        <option key={o.id} value={o.id} className="bg-surface-dark">
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    value={c.value}
                                    onChange={(e) => updateCondition(c.id, 'value', e.target.value)}
                                    placeholder={FIELDS.find((f) => f.id === c.field)?.example || ''}
                                    inputMode="decimal"
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                                />
                                <button
                                    type="button"
                                    disabled={conditions.length === 1}
                                    onClick={() => removeCondition(c.id)}
                                    className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-white/5 rounded-lg disabled:opacity-30"
                                >
                                    <span className="material-icons text-base">remove_circle_outline</span>
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addCondition}
                        className="mt-3 flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold text-primary hover:text-primary-dark"
                    >
                        <span className="material-icons text-sm">add</span>
                        Add condition
                    </button>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Save alert
                    </button>
                    {feedback && (
                        <span className={`text-xs ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {feedback.message}
                        </span>
                    )}
                </div>
            </section>

            <section>
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                    Saved alerts ({alerts.length})
                </h3>
                {alerts.length === 0 ? (
                    <p className="text-text-muted text-sm py-6">No alerts yet. Compose one above.</p>
                ) : (
                    <div className="space-y-2">
                        {alerts.map((a) => (
                            <div
                                key={a.id}
                                className={`bg-surface-dark border rounded-2xl p-4 transition-colors ${
                                    a.active ? 'border-primary/20' : 'border-white/5 opacity-60'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{a.name}</span>
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                                                {a.ticker}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-text-muted mt-0.5">
                                            Created {new Date(a.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => toggleActive(a.id)}
                                            className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${
                                                a.active
                                                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                                    : 'text-text-muted border-white/10 bg-white/5'
                                            }`}
                                        >
                                            {a.active ? 'Active' : 'Paused'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeAlert(a.id)}
                                            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-white/5 rounded-lg"
                                        >
                                            <span className="material-icons text-base">delete_outline</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {a.conditions.map((c, i) => (
                                        <span key={i} className="text-[10px] font-mono text-text-secondary bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                                            {FIELDS.find((f) => f.id === c.field)?.label}{' '}
                                            {OPERATORS.find((o) => o.id === c.operator)?.label}{' '}
                                            <span className="text-white">{c.value}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Alerts persist locally · Server-side eval + push delivery in next backend update
            </p>
        </div>
    );
};

export default DashboardAlertBuilder;
