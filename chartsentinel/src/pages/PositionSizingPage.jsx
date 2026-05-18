import { useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/ui/SEO'
import Footer from '../sections/Footer/Footer'
import { API_CONFIG } from '../config/api'

// Public position-sizing calculator at /tools/position-size. Tiny form
// posting to /api/signals/position-size — the backend math is pure
// (no DB, no auth), so this is also a useful marketing surface
// because anyone can use it without a login.

const fmtMoney = (n) =>
    n === null || n === undefined || Number.isNaN(n)
        ? '—'
        : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const fmtPct = (n, digits = 1) =>
    n === null || n === undefined || Number.isNaN(n)
        ? '—'
        : `${(n * 100).toFixed(digits)}%`

export default function PositionSizingPage() {
    const [form, setForm] = useState({
        accountSize: '10000',
        riskPercent: '1',
        riskDollars: '',
        entry: '',
        stop: '',
        side: 'long',
    })
    const [state, setState] = useState({ status: 'idle', data: null, error: null })

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

    const submit = async (e) => {
        e.preventDefault()
        setState({ status: 'loading', data: null, error: null })
        const body = {
            accountSize: Number(form.accountSize),
            entry: Number(form.entry),
            stop: Number(form.stop),
            side: form.side,
        }
        if (form.riskDollars && Number(form.riskDollars) > 0) {
            body.riskDollars = Number(form.riskDollars)
        } else if (form.riskPercent && Number(form.riskPercent) > 0) {
            body.riskPercent = Number(form.riskPercent)
        }
        try {
            const res = await fetch(`${API_CONFIG.baseURL}/signals/position-size`, {
                method: 'POST',
                headers: { ...API_CONFIG.headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`)
            }
            setState({ status: 'ready', data, error: null })
        } catch (err) {
            setState({ status: 'error', data: null, error: err.message })
        }
    }

    return (
        <div className="relative z-10 w-full bg-background-dark text-text-primary min-h-screen">
            <SEO
                title="Position sizing calculator"
                description="Calculate how many shares to buy given account size, entry, stop, and risk per trade — free, no signup, exact math."
                path="/tools/position-size"
            />

            <div className="max-w-3xl mx-auto px-6 pt-32 pb-20">
                <header className="mb-10 text-center">
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Trader tools
                    </span>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-white mt-3">
                        Position sizing calculator
                    </h1>
                    <p className="text-text-secondary max-w-xl mx-auto mt-4">
                        Given your account size, entry, stop loss, and how much you&apos;re willing to
                        risk on the trade — how many shares should you actually buy?
                    </p>
                </header>

                <form
                    onSubmit={submit}
                    className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur p-6 md:p-8 space-y-5"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Account size ($)"
                            type="number"
                            value={form.accountSize}
                            onChange={(v) => update('accountSize', v)}
                            placeholder="10000"
                        />
                        <Field
                            label="Side"
                            type="select"
                            value={form.side}
                            onChange={(v) => update('side', v)}
                            options={[
                                { value: 'long', label: 'Long' },
                                { value: 'short', label: 'Short' },
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Entry price"
                            type="number"
                            step="0.01"
                            value={form.entry}
                            onChange={(v) => update('entry', v)}
                            placeholder="190.00"
                        />
                        <Field
                            label="Stop loss"
                            type="number"
                            step="0.01"
                            value={form.stop}
                            onChange={(v) => update('stop', v)}
                            placeholder="185.00"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Risk per trade (%)"
                            type="number"
                            step="0.1"
                            value={form.riskPercent}
                            onChange={(v) => update('riskPercent', v)}
                            placeholder="1"
                        />
                        <Field
                            label="Or fixed risk ($) — overrides %"
                            type="number"
                            step="1"
                            value={form.riskDollars}
                            onChange={(v) => update('riskDollars', v)}
                            placeholder="optional"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={state.status === 'loading'}
                        className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {state.status === 'loading' ? 'Calculating…' : 'Calculate position'}
                    </button>

                    {state.status === 'error' && (
                        <p className="text-sm text-red-300">{state.error}</p>
                    )}
                </form>

                {state.status === 'ready' && state.data && (
                    <section className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 md:p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Stat label="Shares" value={state.data.shares.toLocaleString()} tone="text-emerald-300" big />
                            <Stat label="Risk on trade" value={fmtMoney(state.data.riskAmount)} />
                            <Stat label="Per-share risk" value={fmtMoney(state.data.perShareRisk)} />
                            <Stat
                                label="Notional"
                                value={fmtMoney(state.data.notional)}
                                sub={`${fmtPct(state.data.notionalPctOfAccount)} of account`}
                            />
                        </div>
                        {state.data.rrWarning && (
                            <p className="text-xs text-amber-300 mt-4">⚠ {state.data.rrWarning}</p>
                        )}
                        <p className="text-[10px] text-text-muted mt-4">
                            Informational only — not financial advice. The shares figure assumes no
                            commission or slippage; pad your stop accordingly for real-world fills.
                        </p>
                    </section>
                )}

                <div className="mt-10 text-center">
                    <Link to="/services" className="text-sm text-primary hover:underline">
                        ← All trader tools
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    )
}

function Field({ label, value, onChange, type = 'text', step, placeholder, options }) {
    return (
        <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5 block">
                {label}
            </span>
            {type === 'select' ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-background-dark/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value} className="bg-surface-dark">
                            {o.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-background-dark/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                />
            )}
        </label>
    )
}

function Stat({ label, value, sub, tone = 'text-white', big = false }) {
    return (
        <div>
            <div className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                {label}
            </div>
            <div className={`${big ? 'text-3xl' : 'text-lg'} font-mono font-bold tabular-nums ${tone}`}>
                {value}
            </div>
            {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
        </div>
    )
}
