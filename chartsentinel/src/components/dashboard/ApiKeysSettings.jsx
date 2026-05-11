import { useEffect, useState } from 'react'
import api from '../../services/api'

// Ultimate-tier programmatic API key manager. Lists existing keys
// (showing only the prefix), mints new ones (revealing the plaintext
// exactly once — there's no "show again" because we don't store it),
// and revokes by id.

export default function ApiKeysSettings() {
    const [keys, setKeys] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [label, setLabel] = useState('')
    const [creating, setCreating] = useState(false)
    const [justCreated, setJustCreated] = useState(null) // plaintext shown once
    const [copied, setCopied] = useState(false)

    const refresh = async () => {
        setLoading(true)
        setError(null)
        try {
            const { keys: rows } = await api.get('/auth/api-keys')
            setKeys(rows || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!label.trim() || creating) return
        setCreating(true)
        setError(null)
        try {
            const { key } = await api.post('/auth/api-keys', { label: label.trim() })
            setJustCreated(key)
            setLabel('')
            refresh()
        } catch (err) {
            setError(err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleRevoke = async (id) => {
        if (!confirm('Revoke this key? Any callers using it will break immediately.')) return
        try {
            await api.delete(`/auth/api-keys/${id}`)
            refresh()
        } catch (err) {
            setError(err.message)
        }
    }

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            /* ignore */
        }
    }

    return (
        <div className="space-y-5">
            {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-2 text-sm">
                    {error}
                </div>
            )}

            {justCreated && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold mb-2">
                        Your new key — copy it now, we won&apos;t show it again
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 min-w-0 truncate text-sm text-white bg-black/40 px-3 py-2 rounded">
                            {justCreated.plaintext}
                        </code>
                        <button
                            onClick={() => copyToClipboard(justCreated.plaintext)}
                            className="px-3 py-2 rounded bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <button
                        onClick={() => setJustCreated(null)}
                        className="text-xs text-text-muted hover:text-white"
                    >
                        I&apos;ve saved it. Dismiss.
                    </button>
                </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-[200px]">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5 block">
                        Key label
                    </span>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="e.g. Production bot, CI dashboard"
                        className="w-full bg-background-dark/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                    />
                </label>
                <button
                    type="submit"
                    disabled={creating || !label.trim()}
                    className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                    {creating ? 'Minting…' : 'Mint key'}
                </button>
            </form>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                {loading && (
                    <div className="text-text-muted text-sm text-center py-6">Loading keys…</div>
                )}
                {!loading && keys.length === 0 && (
                    <div className="text-text-muted text-sm text-center py-6">
                        No keys yet. Mint one above.
                    </div>
                )}
                {!loading && keys.length > 0 && (
                    <ul className="divide-y divide-white/5">
                        {keys.map((k) => (
                            <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <div className="text-white text-sm font-bold truncate">{k.label}</div>
                                    <div className="text-[10px] text-text-muted font-mono">
                                        {k.prefix}…  ·  {new Date(k.createdAt).toLocaleDateString()}
                                        {k.lastUsedAt && (
                                            <> · last used {new Date(k.lastUsedAt).toLocaleDateString()}</>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRevoke(k.id)}
                                    className="text-[10px] uppercase tracking-widest text-red-300 hover:text-red-200 px-3 py-1.5 rounded-full border border-red-500/20 hover:bg-red-500/10"
                                >
                                    Revoke
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <details className="text-[11px] text-text-muted">
                <summary className="cursor-pointer hover:text-white">API usage example</summary>
                <pre className="mt-2 bg-black/40 p-3 rounded overflow-x-auto text-[10px] text-white">
{`curl https://api.chartsentinel.com/api/v1/score/AAPL \\
  -H "X-Api-Key: cs_live_..."`}
                </pre>
                <p className="mt-2">
                    Endpoints: <code>/v1/me</code>, <code>/v1/score/:ticker</code>,{' '}
                    <code>/v1/history/:ticker</code>, <code>/v1/insider/clusters</code>,{' '}
                    <code>/v1/insider/history</code>. Rate-limit: 600 req / 5 min per key.
                </p>
            </details>
        </div>
    )
}
