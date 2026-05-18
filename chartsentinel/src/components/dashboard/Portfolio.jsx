import { useEffect, useState } from 'react';
import api from '../../services/api';
import PortfolioRiskPanel from './PortfolioRiskPanel';

// Manage user portfolios — named baskets of (ticker, weight) — and view
// the weighted composite score across each basket. Reads/writes go
// through /api/portfolios; aggregate scoring uses the user's saved
// signal-mix weights server-side.

const SIGNAL_TINT = (score) => {
    if (score == null) return 'text-text-muted';
    if (score >= 60) return 'text-emerald-300';
    if (score >= 25) return 'text-emerald-400';
    if (score <= -60) return 'text-red-300';
    if (score <= -25) return 'text-red-400';
    return 'text-text-secondary';
};

const SIGNAL_LABEL = {
    strong_buy: 'Strong buy',
    buy: 'Buy',
    neutral: 'Neutral',
    sell: 'Sell',
    strong_sell: 'Strong sell',
};

// Brokerage CSV exports vary by provider; we sniff a handful of common
// column names and pull whichever pair looks like (ticker, size). Done
// in plain JS rather than papaparse — the file is small, the format is
// nearly always quoted-on-comma, and we'd rather control the matching
// than learn a library's edge cases.
const TICKER_HEADERS = [
    'symbol', 'ticker', 'instrument', 'security', 'asset', 'cusip', 'description',
];
const SIZE_HEADERS = [
    'quantity', 'qty', 'shares', 'position', 'units', 'amount', 'size',
];

function splitCsvLine(line) {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQ = !inQ;
            }
        } else if (ch === ',' && !inQ) {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out.map((s) => s.trim());
}

function parseBrokerCsv(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Scan for a header row — some brokers prepend an account-summary
    // block before the actual positions header. We look at the first
    // 10 lines and take whichever row has both a ticker-like and a
    // size-like column.
    let headerIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const cols = splitCsvLine(lines[i]).map((c) => c.toLowerCase());
        const hasTicker = cols.some((c) => TICKER_HEADERS.some((h) => c === h || c.includes(h)));
        const hasSize = cols.some((c) => SIZE_HEADERS.some((h) => c === h || c.includes(h)));
        if (hasTicker && hasSize) {
            headerIdx = i;
            headers = cols;
            break;
        }
    }
    if (headerIdx === -1) return [];

    const tickerCol = headers.findIndex((c) => TICKER_HEADERS.some((h) => c === h));
    const tickerColFuzzy =
        tickerCol >= 0 ? tickerCol : headers.findIndex((c) => TICKER_HEADERS.some((h) => c.includes(h)));
    const sizeCol = headers.findIndex((c) => SIZE_HEADERS.some((h) => c === h));
    const sizeColFuzzy =
        sizeCol >= 0 ? sizeCol : headers.findIndex((c) => SIZE_HEADERS.some((h) => c.includes(h)));
    if (tickerColFuzzy < 0 || sizeColFuzzy < 0) return [];

    const rows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const cols = splitCsvLine(lines[i]);
        const ticker = (cols[tickerColFuzzy] || '').replace(/[^A-Z0-9.=_\-^]/gi, '').toUpperCase();
        const sizeRaw = (cols[sizeColFuzzy] || '').replace(/[,_$]/g, '');
        const weight = Number(sizeRaw);
        if (!ticker || !Number.isFinite(weight) || weight <= 0) continue;
        rows.push({ ticker, weight });
    }
    return rows;
}

const DashboardPortfolio = () => {
    const [portfolios, setPortfolios] = useState([]);
    const [tickers, setTickers] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [hydrating, setHydrating] = useState(true);

    const [score, setScore] = useState(null);
    const [scoring, setScoring] = useState(false);

    const [editorRows, setEditorRows] = useState([]);
    const [newName, setNewName] = useState('');

    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [busy, setBusy] = useState(false);

    const active = portfolios.find((p) => p.id === activeId) || null;

    useEffect(() => {
        let cancelled = false;
        Promise.all([api.get('/portfolios'), api.get('/signals/tickers')])
            .then(([list, t]) => {
                if (cancelled) return;
                const ports = list.portfolios || [];
                setPortfolios(ports);
                setTickers(t.all || []);
                if (ports.length && !activeId) setActiveId(ports[0].id);
            })
            .catch((err) => !cancelled && setError(err.message))
            .finally(() => !cancelled && setHydrating(false));
        return () => {
            cancelled = true;
        };
        // We deliberately omit activeId so the initial mount only ever
        // auto-selects on first load — switching portfolios later goes
        // through setActiveId directly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync the editor + score to whichever portfolio is active.
    useEffect(() => {
        if (!active) {
            setEditorRows([]);
            setScore(null);
            return;
        }
        setEditorRows(
            active.items.map((it) => ({ ticker: it.ticker, weight: it.weight })),
        );
        setScore(null);
    }, [active]);

    const refreshList = async () => {
        const list = await api.get('/portfolios');
        setPortfolios(list.portfolios || []);
        return list.portfolios || [];
    };

    const createPortfolio = async () => {
        if (!newName.trim()) return;
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            const resp = await api.post('/portfolios', { name: newName.trim() });
            await refreshList();
            setActiveId(resp.portfolio.id);
            setNewName('');
            setNotice(`Created “${resp.portfolio.name}”.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const deletePortfolio = async (id) => {
        if (!window.confirm('Delete this portfolio? Holdings will be removed.')) return;
        setBusy(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${api.baseURL}/portfolios/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Delete failed.');
            const next = await refreshList();
            setActiveId(next[0]?.id ?? null);
            setNotice('Portfolio deleted.');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const updateRow = (idx, key, value) => {
        setEditorRows((rows) => {
            const next = [...rows];
            next[idx] = { ...next[idx], [key]: key === 'weight' ? Number(value) : value };
            return next;
        });
    };

    const addRow = () => {
        setEditorRows((rows) => [...rows, { ticker: '', weight: 1 }]);
    };

    // Brokerage CSV import. Most retail brokers (IBKR, Robinhood,
    // Fidelity, Schwab, ETrade) let you export positions as CSV.
    // Column names vary wildly so we sniff a handful of headers
    // and pull whatever pair best resembles (ticker, position-size).
    // Anything we can't parse just gets logged and ignored — partial
    // success is better than rejecting a 30-line file because the
    // last row had a stray comma.
    const importCsv = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onerror = () => setError('Could not read that file.');
        reader.onload = () => {
            try {
                const text = String(reader.result || '');
                const rows = parseBrokerCsv(text);
                if (rows.length === 0) {
                    setError('No recognizable positions in that file.');
                    return;
                }
                // Merge with any existing rows; later imports of the
                // same ticker overwrite the earlier weight.
                setEditorRows((existing) => {
                    const map = new Map(existing.map((r) => [r.ticker.trim().toUpperCase(), r]));
                    for (const row of rows) {
                        map.set(row.ticker.toUpperCase(), row);
                    }
                    return Array.from(map.values()).filter((r) => r.ticker);
                });
                setNotice(`Imported ${rows.length} position${rows.length === 1 ? '' : 's'} — review and save.`);
                setError(null);
            } catch (err) {
                setError(`CSV parse failed: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const removeRow = (idx) => {
        setEditorRows((rows) => rows.filter((_, i) => i !== idx));
    };

    const saveItems = async () => {
        if (!active) return;
        const cleaned = editorRows
            .map((r) => ({ ticker: r.ticker.trim(), weight: Number(r.weight) }))
            .filter((r) => r.ticker && Number.isFinite(r.weight) && r.weight > 0);
        // Dedupe by ticker — server enforces unique(portfolioId, ticker)
        // but it's nicer UX to catch it here than show a 400.
        const seen = new Set();
        for (const row of cleaned) {
            if (seen.has(row.ticker)) {
                setError(`Duplicate ticker: ${row.ticker}`);
                return;
            }
            seen.add(row.ticker);
        }

        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${api.baseURL}/portfolios/${active.id}/items`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ items: cleaned }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Save failed.');
            }
            await refreshList();
            setNotice('Holdings saved.');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const scoreActive = async () => {
        if (!active) return;
        setScoring(true);
        setError(null);
        try {
            const result = await api.get(`/portfolios/${active.id}/score`);
            setScore(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setScoring(false);
        }
    };

    if (hydrating) {
        return (
            <div className="flex items-center justify-center h-64 text-text-secondary">
                <span className="material-icons animate-spin text-3xl text-primary/60">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-4xl font-bold tracking-tight text-white">Portfolio mode</h1>
                <p className="mt-2 text-text-secondary max-w-2xl">
                    Define your actual basket of holdings and get one weighted
                    composite score across the portfolio — instead of checking
                    each ticker one at a time. Sub-scores use your saved signal
                    mix.
                </p>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
                    {error}
                </div>
            )}
            {notice && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-200">
                    {notice}
                </div>
            )}

            <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">
                    Your portfolios
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    {portfolios.length === 0 && (
                        <p className="text-sm text-text-muted">
                            Name a basket below — your first portfolio is one input away.
                        </p>
                    )}
                    {portfolios.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setActiveId(p.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                activeId === p.id
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                            }`}
                        >
                            {p.name} <span className="text-xs opacity-70">({p.items.length})</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="New portfolio name…"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/30"
                    />
                    <button
                        onClick={createPortfolio}
                        disabled={busy || !newName.trim()}
                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        Create
                    </button>
                </div>
            </section>

            {active && (
                <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">{active.name}</h2>
                        <button
                            onClick={() => deletePortfolio(active.id)}
                            disabled={busy}
                            className="text-xs text-red-300 hover:text-red-200 transition-colors disabled:opacity-50"
                        >
                            Delete portfolio
                        </button>
                    </div>

                    <div className="space-y-2">
                        {editorRows.length === 0 && (
                            <p className="text-sm text-text-muted py-2">No holdings yet — add one below.</p>
                        )}
                        {editorRows.map((row, idx) => (
                            // Mobile: stack ticker, weight, remove on top of each
                            // other (a 12-col split at 320px gives a 56px-wide
                            // dropdown that can't show full ticker names).
                            // sm+ goes back to the inline grid.
                            <div
                                key={idx}
                                className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center"
                            >
                                <select
                                    value={row.ticker}
                                    onChange={(e) => updateRow(idx, 'ticker', e.target.value)}
                                    className="sm:col-span-7 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                                >
                                    <option value="">Pick ticker…</option>
                                    {tickers.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={row.weight}
                                    onChange={(e) => updateRow(idx, 'weight', e.target.value)}
                                    className="sm:col-span-3 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white text-right font-mono"
                                />
                                <button
                                    onClick={() => removeRow(idx)}
                                    className="sm:col-span-2 self-end sm:self-auto px-2 py-1 sm:p-0 text-xs text-text-muted hover:text-red-300 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                        <button
                            onClick={addRow}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-md transition-colors"
                        >
                            + Add holding
                        </button>
                        <label className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5">
                            <span className="material-icons text-sm">upload_file</span>
                            Import CSV
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={(e) => {
                                    importCsv(e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                                className="hidden"
                            />
                        </label>
                        <button
                            onClick={saveItems}
                            disabled={busy}
                            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {busy ? 'Saving…' : 'Save holdings'}
                        </button>
                        <button
                            onClick={scoreActive}
                            disabled={scoring || active.items.length === 0}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                            {scoring ? 'Scoring…' : 'Score portfolio'}
                        </button>
                    </div>

                    <p className="text-xs text-text-muted mt-3">
                        Weights are raw — they don&apos;t need to add to 100.
                        Use whatever scale makes sense (dollars, share counts,
                        percent allocations) and the scorer will normalise.
                    </p>
                </section>
            )}

            {score && (
                <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                            Aggregate score
                        </h2>
                        <button
                            onClick={() => window.print()}
                            className="print-hide text-xs text-text-muted hover:text-white inline-flex items-center gap-1"
                            title="Print or export as PDF"
                        >
                            <span className="material-icons text-base">picture_as_pdf</span>
                            Export PDF
                        </button>
                    </div>
                    <div className="flex items-baseline gap-4 mb-6">
                        <span className={`text-5xl font-bold font-mono ${SIGNAL_TINT(score.aggregate.score)}`}>
                            {score.aggregate.score >= 0 ? '+' : ''}{score.aggregate.score}
                        </span>
                        <span className="text-text-secondary">
                            {SIGNAL_LABEL[score.aggregate.signal] ?? score.aggregate.signal}
                            <span className="text-text-muted text-xs ml-2">
                                ({score.aggregate.sampledItems} of {score.items.length} sampled)
                            </span>
                        </span>
                    </div>

                    <div className="overflow-x-auto -mx-5">
                        <table className="min-w-full text-xs">
                            <thead className="text-text-muted border-b border-white/5">
                                <tr>
                                    <th className="text-left px-5 py-2 font-medium">Ticker</th>
                                    <th className="text-right px-3 py-2 font-medium">Weight</th>
                                    <th className="text-right px-3 py-2 font-medium">Score</th>
                                    <th className="text-right px-3 py-2 font-medium">Signal</th>
                                    <th className="text-right px-3 py-2 font-medium">Seasonal</th>
                                    <th className="text-right px-3 py-2 font-medium">COT</th>
                                    <th className="text-right px-5 py-2 font-medium">Pattern</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {score.items.map((it) => (
                                    <tr key={it.ticker} className="text-text-secondary">
                                        <td className="px-5 py-2 font-mono text-white">{it.ticker}</td>
                                        <td className="px-3 py-2 text-right font-mono">{it.weight}</td>
                                        <td className={`px-3 py-2 text-right font-mono ${SIGNAL_TINT(it.score)}`}>
                                            {it.score == null ? '—' : (it.score >= 0 ? '+' : '') + it.score}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs">
                                            {SIGNAL_LABEL[it.signal] ?? it.signal ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {it.components?.seasonal ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {it.components?.cot ?? '—'}
                                        </td>
                                        <td className="px-5 py-2 text-right font-mono">
                                            {it.components?.pattern ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Risk + correlation views — always shown for the
                active portfolio, regardless of whether the user
                has scored it yet. */}
            {active && active.items.length > 0 && (
                <PortfolioRiskPanel portfolioId={active.id} />
            )}
        </div>
    );
};

export default DashboardPortfolio;
