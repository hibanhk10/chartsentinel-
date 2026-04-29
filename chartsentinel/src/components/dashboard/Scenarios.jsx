import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Scenario Sandbox — wrap a hypothetical macro scenario with a tuned
// system prompt and route it through the existing /api/ai/interrogate
// endpoint. We keep the prompt-engineering on the client so backend
// changes aren't required as the tone evolves.

const SCENARIO_PRESETS = [
    'Fed cuts 50bps at next FOMC',
    'BoJ hikes 50bps unexpectedly',
    'Brent breaks $120 on Strait of Hormuz closure',
    'Taiwan blockade scenario triggers',
    'US 10Y yield breaches 5.5%',
    'BTC drops 30% in one week',
];

const ASSET_CLASSES = ['Equities', 'Rates', 'FX', 'Commodities', 'Crypto', 'Credit'];
const HISTORY_KEY = 'cs.scenarios.history';
const HISTORY_LIMIT = 8;

function buildPrompt(scenario, classes) {
    const surfaceSpec
        = classes.length === 0
            ? 'across all major asset classes'
            : `with focus on: ${classes.join(', ')}`;

    return (
        `Hypothetical scenario: "${scenario}".\n\n`
        + `Find the closest historical analogs (cite the years/episodes) and `
        + `describe what each asset class typically did in those analogs ${surfaceSpec}. `
        + `Be specific about magnitude and time-horizon. Format as: `
        + `(1) Closest analog episodes (1-3 with dates). `
        + `(2) Cross-asset playbook from those analogs (one bullet per asset class). `
        + `(3) Caveats and what might make this time different.`
    );
}

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveToHistory(entry) {
    const list = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    return list;
}

const DashboardScenarios = () => {
    const [scenario, setScenario] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        setHistory(loadHistory());
    }, []);

    const toggleClass = (c) => {
        setSelectedClasses((prev) =>
            prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
        );
    };

    const runScenario = async () => {
        if (!scenario.trim() || loading) return;
        setLoading(true);
        setError(null);
        setResponse('');
        try {
            const res = await fetch(`${API_CONFIG.baseURL}/ai/interrogate`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({ message: buildPrompt(scenario.trim(), selectedClasses) }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
            const text = body?.text || 'No response.';
            setResponse(text);
            const entry = {
                id: Date.now(),
                scenario: scenario.trim(),
                classes: selectedClasses,
                response: text,
                createdAt: new Date().toISOString(),
            };
            setHistory(saveToHistory(entry));
        } catch (err) {
            setError(err.message || 'Failed to run scenario.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Scenario Sandbox
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    What if it rhymes?
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Drop in a hypothetical, get the closest historical analogs and
                    the cross-asset playbook from each. Useful for stress-testing
                    sizing decisions before they happen.
                </p>
            </header>

            <section className="bg-surface-dark border border-white/5 rounded-2xl p-5 space-y-5">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Scenario
                    </label>
                    <textarea
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                        placeholder="e.g. Fed cuts 50bps at next FOMC"
                        rows={3}
                        maxLength={400}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {SCENARIO_PRESETS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setScenario(p)}
                                className="text-[10px] uppercase tracking-widest font-bold text-text-muted bg-white/5 border border-white/10 px-2 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Focus asset classes <span className="normal-case text-text-muted/60">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ASSET_CLASSES.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => toggleClass(c)}
                                className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                                    selectedClasses.includes(c)
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={runScenario}
                        disabled={!scenario.trim() || loading}
                        className="px-5 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Analysing…' : 'Run scenario'}
                    </button>
                    {error && <span className="text-red-400 text-xs">{error}</span>}
                </div>
            </section>

            {response && (
                <section className="bg-surface-dark border border-primary/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-icons text-primary text-base">auto_awesome</span>
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Analyst note</span>
                    </div>
                    <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{response}</p>
                </section>
            )}

            {history.length > 0 && (
                <section>
                    <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                        Recent scenarios
                    </h3>
                    <div className="space-y-2">
                        {history.map((h) => (
                            <button
                                key={h.id}
                                type="button"
                                onClick={() => {
                                    setScenario(h.scenario);
                                    setSelectedClasses(h.classes);
                                    setResponse(h.response);
                                }}
                                className="w-full text-left bg-surface-dark border border-white/5 rounded-xl p-3 hover:border-white/15 transition-colors"
                            >
                                <p className="text-xs text-white font-bold mb-1">{h.scenario}</p>
                                <p className="text-[10px] text-text-muted line-clamp-2">{h.response}</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default DashboardScenarios;
