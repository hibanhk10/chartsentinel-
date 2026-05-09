import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SEO from '../components/ui/SEO'
import Footer from '../sections/Footer/Footer'
import { parseChangelog, renderInline } from '../lib/changelog-parser'

// Public "what's new" page. Reads /changelog.md (copied from the repo
// root by the prebuild step) so adding a release in CHANGELOG.md is
// the only change required to update this page.

function InlineText({ text }) {
    const parts = renderInline(text) || []
    return (
        <>
            {parts.map((p, i) => {
                if (typeof p === 'string') return <span key={i}>{p}</span>
                if (p.type === 'bold') return <strong key={p.key} className="text-white">{p.text}</strong>
                if (p.type === 'italic') return <em key={p.key}>{p.text}</em>
                if (p.type === 'code') return (
                    <code key={p.key} className="text-primary bg-white/5 px-1.5 py-0.5 rounded text-xs font-mono">
                        {p.text}
                    </code>
                )
                if (p.type === 'link') return (
                    <a key={p.key} href={p.href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {p.text}
                    </a>
                )
                return null
            })}
        </>
    )
}

const SECTION_TONE = {
    'Added': { tag: 'NEW', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
    'Added — Foundation': { tag: 'NEW', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
    'Added — Activation': { tag: 'NEW', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
    'Added — Differentiation': { tag: 'NEW', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
    'Added — Pro-tier': { tag: 'NEW', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
    'Changed': { tag: 'CHANGED', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
    'Fixed': { tag: 'FIX', tone: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
    'Removed': { tag: 'GONE', tone: 'text-red-300 bg-red-500/10 border-red-500/30' },
}

function sectionTone(title) {
    return (
        SECTION_TONE[title] ?? {
            tag: title.toUpperCase().slice(0, 6),
            tone: 'text-text-muted bg-white/5 border-white/10',
        }
    )
}

export default function ChangelogPage() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null })

    useEffect(() => {
        let active = true
        fetch('/changelog.md')
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((md) => active && setState({ status: 'ready', data: parseChangelog(md), error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }))
        return () => {
            active = false
        }
    }, [])

    return (
        <div className="relative z-10 w-full bg-background-dark text-text-primary min-h-screen">
            <SEO
                title="What's new"
                description="Recent ChartSentinel releases — features, fixes, and changes to the platform."
                path="/whats-new"
            />

            <div className="max-w-3xl mx-auto px-6 pt-32 pb-16">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-12 text-center"
                >
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Releases
                    </span>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-white mt-3">
                        What&apos;s new
                    </h1>
                    <p className="text-text-secondary max-w-xl mx-auto mt-4">
                        Every notable change to ChartSentinel, newest first.
                    </p>
                </motion.header>

                {state.status === 'loading' && (
                    <div className="text-center text-text-muted py-12">Loading…</div>
                )}
                {state.status === 'error' && (
                    <div className="text-center text-red-300 py-12">Failed: {state.error}</div>
                )}
                {state.status === 'ready' && state.data.releases.length === 0 && (
                    <div className="text-center text-text-muted py-12">No releases yet.</div>
                )}

                {state.status === 'ready' && state.data.releases.map((release, idx) => (
                    <motion.article
                        key={release.version}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ duration: 0.4 }}
                        className="mb-12 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur p-6 md:p-8"
                    >
                        <header className="flex items-center justify-between gap-4 flex-wrap mb-4">
                            <div className="flex items-baseline gap-3">
                                <h2 className="text-2xl font-bold text-white">v{release.version}</h2>
                                {idx === 0 && (
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
                                        Latest
                                    </span>
                                )}
                            </div>
                            <time className="text-xs text-text-muted">
                                {new Date(release.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </time>
                        </header>

                        {release.summary && (
                            <p className="text-text-secondary mb-6 leading-relaxed">
                                <InlineText text={release.summary} />
                            </p>
                        )}

                        {release.sections.filter((s) => s.items.length > 0).map((sec) => {
                            const t = sectionTone(sec.title)
                            return (
                                <div key={sec.title} className="mb-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${t.tone}`}>
                                            {t.tag}
                                        </span>
                                        <span className="text-xs uppercase tracking-widest text-text-muted">
                                            {sec.title}
                                        </span>
                                    </div>
                                    <ul className="space-y-2">
                                        {sec.items.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
                                                <span className="material-icons text-primary text-xs mt-1 shrink-0">arrow_right</span>
                                                <span><InlineText text={item} /></span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })}
                    </motion.article>
                ))}
            </div>

            <Footer />
        </div>
    )
}
