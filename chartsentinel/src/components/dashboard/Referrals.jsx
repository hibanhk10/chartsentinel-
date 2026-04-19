import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Share-your-code surface. Lazy-loads the code (backend only creates it on
// first request) so users who never open this tab never pollute the DB.

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://www.chartsentinel.com';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    ...API_CONFIG.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function DashboardReferrals() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [copied, setCopied] = useState(null); // 'code' | 'link' | null

  useEffect(() => {
    let active = true;
    fetch(`${API_CONFIG.baseURL}/referral`, { headers: authHeaders() })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || body.message || `HTTP ${r.status}`);
        return body;
      })
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, []);

  async function copy(text, kind) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Fallback for browsers without Clipboard API access (rare).
      prompt('Copy the code below', text);
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-white/[0.03] rounded-md w-48" />
        <div className="h-24 bg-white/[0.03] rounded-xl" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
        Could not load your referral info: {state.error}
      </div>
    );
  }

  const code = state.data.code;
  const link = `${ORIGIN}/?ref=${encodeURIComponent(code)}`;

  const shareSubject = 'ChartSentinel — composite trading signals';
  const shareBody = `I've been using ChartSentinel — composite signals across FX, crypto, and equities. You can get a free month if you sign up through my link: ${link}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-white">Invite friends</h1>
        <p className="mt-2 text-text-secondary max-w-2xl">
          Share your code. When a friend signs up through your link and upgrades to a paid
          plan, you both get a month on us.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <StatTile label="Signups from your link" value={state.data.usageCount} />
        <StatTile label="Rewards earned" value={state.data.rewardsEarned} sub="free months" accent="text-emerald-300" />
        <StatTile label="Your code" value={code} mono accent="text-primary" />
      </div>

      <section className="bg-white/[0.03] border border-white/5 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-text-muted">Share link</label>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white font-mono"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => copy(link, 'link')}
              className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              {copied === 'link' ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-text-muted">Or share the code</label>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              readOnly
              value={code}
              className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white font-mono text-center"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => copy(code, 'code')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              {copied === 'code' ? 'Copied ✓' : 'Copy code'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <ShareButton
            label="Share on X"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareBody)}`}
          />
          <ShareButton
            label="Share on WhatsApp"
            href={`https://wa.me/?text=${encodeURIComponent(shareBody)}`}
          />
          <ShareButton
            label="Email"
            href={`mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`}
          />
        </div>
      </section>

      <div className="bg-white/[0.02] border border-white/5 rounded-lg p-5 text-sm text-text-secondary">
        <p className="font-semibold text-white mb-2">How it works</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Anyone who opens your link lands on ChartSentinel with your code pre-attached.</li>
          <li>When they sign up and start a paid plan, we automatically credit both of you.</li>
          <li>Rewards are applied as a free month against your next invoice — no action needed on your side.</li>
        </ul>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, accent, mono }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent || 'text-white'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

function ShareButton({ label, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
    >
      <span className="material-icons text-base">share</span>
      {label}
    </a>
  );
}
