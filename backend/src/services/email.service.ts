import { Resend } from 'resend';
import env from '../config/env';

// Thin wrapper around Resend. If RESEND_API_KEY is unset the whole thing
// becomes a no-op that logs to stdout — which is the right behaviour for
// local dev (no surprise outbound emails) and for deployments that haven't
// wired Resend yet (boot doesn't fail, password reset endpoints just don't
// actually send mail).

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM = env.EMAIL_FROM || 'ChartSentinel <no-reply@chartsentinel.com>';
const APP_URL = env.APP_URL || 'http://localhost:5173';

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function send({ to, subject, html, text }: SendArgs) {
  if (!resend) {
    // Dev / un-wired env — log so a developer can still see that the flow
    // got to the right place, but don't throw.
    console.log(`[email] (no key — not sending) to=${to} subject=${subject}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

// --- templates ---------------------------------------------------------

// Kept inline rather than in a template engine because there are only two of
// them and React Email would be overkill. Minimal HTML that works in every
// mail client, including Outlook and Apple Mail in dark mode.

function passwordResetTemplate(resetUrl: string) {
  const text = [
    'Reset your ChartSentinel password',
    '',
    'We received a request to reset your password. Open this link within 1 hour:',
    resetUrl,
    '',
    'If you did not request this, ignore this email — your password will not change.',
    '',
    'ChartSentinel',
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
      <h2 style="margin:0 0 16px;font-size:20px">Reset your password</h2>
      <p style="line-height:1.5">We received a request to reset the password on your ChartSentinel account.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reset password</a>
      </p>
      <p style="line-height:1.5;color:#555;font-size:13px">Or paste this URL into your browser: <br/><code style="word-break:break-all">${resetUrl}</code></p>
      <p style="line-height:1.5;color:#555;font-size:13px">The link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
      <p style="font-size:12px;color:#888">ChartSentinel — trading intelligence for serious traders.</p>
    </div>
  `;

  return { subject: 'Reset your ChartSentinel password', html, text };
}

function welcomeTemplate() {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const text = [
    'Welcome to ChartSentinel',
    '',
    'Your account is live. Jump straight to the dashboard:',
    dashboardUrl,
    '',
    'Reply to this email if you hit anything weird — a real person reads these.',
    '',
    'ChartSentinel',
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
      <h2 style="margin:0 0 16px;font-size:20px">Welcome to ChartSentinel</h2>
      <p style="line-height:1.5">Your account is live. You can head straight to the dashboard whenever you're ready.</p>
      <p style="margin:24px 0">
        <a href="${dashboardUrl}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Open dashboard</a>
      </p>
      <p style="line-height:1.5;color:#555;font-size:13px">If you hit anything weird, reply to this email — a real person reads these, not a bot.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
      <p style="font-size:12px;color:#888">ChartSentinel — trading intelligence for serious traders.</p>
    </div>
  `;

  return { subject: 'Welcome to ChartSentinel', html, text };
}

// --- public API --------------------------------------------------------

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const { subject, html, text } = passwordResetTemplate(resetUrl);
  await send({ to, subject, html, text });
}

export async function sendWelcomeEmail(to: string) {
  const { subject, html, text } = welcomeTemplate();
  await send({ to, subject, html, text });
}

// --- weekly digest ---------------------------------------------------------

type DigestItem = {
  title: string;
  summary: string;
  url: string;
  date: Date;
};

export async function sendWeeklyDigestEmail(
  to: string,
  items: { reports: DigestItem[]; news: DigestItem[] },
) {
  const { subject, html, text } = weeklyDigestTemplate(items);
  await send({ to, subject, html, text });
}

// --- daily AI briefing ----------------------------------------------------

export type BriefingEmailInputs = {
  transcript: string;
  watchlist: { ticker: string; score: number | null }[];
  upcomingEvents: { date: string; type: string; label: string }[];
  topExposure: { factor: string; weight: number }[];
};

export async function sendDailyBriefingEmail(to: string, inputs: BriefingEmailInputs) {
  const { subject, html, text } = dailyBriefingTemplate(inputs);
  await send({ to, subject, html, text });
}

function dailyBriefingTemplate(inputs: BriefingEmailInputs) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const dashboardUrl = `${APP_URL}/dashboard?tab=briefing`;

  // ── Plain-text version ────────────────────────────────────────────
  const lines = [
    `ChartSentinel — Daily Briefing — ${today}`,
    '',
    inputs.transcript,
    '',
    '─── Inputs used ───',
  ];
  if (inputs.watchlist.length > 0) {
    lines.push('', 'Watchlist:');
    for (const w of inputs.watchlist.slice(0, 5)) {
      const score = w.score === null ? '—' : `${w.score >= 0 ? '+' : ''}${w.score}`;
      lines.push(`  • ${w.ticker} (${score})`);
    }
  }
  if (inputs.upcomingEvents.length > 0) {
    lines.push('', 'Macro events this week:');
    for (const e of inputs.upcomingEvents.slice(0, 5)) {
      lines.push(`  • ${e.date} — ${e.type.toUpperCase()} ${e.label}`);
    }
  }
  if (inputs.topExposure.length > 0) {
    lines.push('', 'Your top portfolio factors:');
    for (const x of inputs.topExposure) {
      lines.push(`  • ${x.factor.toUpperCase()}: ${(x.weight * 100).toFixed(0)}%`);
    }
  }
  lines.push('', `Open dashboard: ${dashboardUrl}`);
  lines.push('', 'Stop daily briefings: ' + `${APP_URL}/dashboard?tab=settings`);
  const text = lines.join('\n');

  // ── HTML — same minimal style as the digest, dark-mode-safe ──
  const inputsHtml = `
    <table style="width:100%;margin-top:32px;border-collapse:collapse">
      <tr style="vertical-align:top">
        <td style="width:33%;padding:0 8px;">
          <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px">Watchlist</p>
          ${inputs.watchlist.length === 0
            ? '<p style="font-size:13px;color:#94a3b8;margin:0">No tickers yet</p>'
            : '<ul style="list-style:none;padding:0;margin:0;font-size:13px">' +
              inputs.watchlist.slice(0, 5).map((w) => {
                const score = w.score === null ? '—' : `${w.score >= 0 ? '+' : ''}${w.score}`;
                return `<li style="padding:4px 0;display:flex;justify-content:space-between"><span style="font-weight:600;color:#0f172a">${w.ticker}</span><span style="font-family:ui-monospace,monospace;color:#475569">${score}</span></li>`;
              }).join('') +
              '</ul>'}
        </td>
        <td style="width:34%;padding:0 8px;border-left:1px solid #eef2f7;border-right:1px solid #eef2f7;">
          <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px">Macro this week</p>
          ${inputs.upcomingEvents.length === 0
            ? '<p style="font-size:13px;color:#94a3b8;margin:0">Nothing scheduled</p>'
            : '<ul style="list-style:none;padding:0;margin:0;font-size:13px">' +
              inputs.upcomingEvents.slice(0, 5).map((e) =>
                `<li style="padding:4px 0;display:flex;justify-content:space-between"><span style="font-weight:600;color:#0f172a">${e.type.toUpperCase()}</span><span style="font-family:ui-monospace,monospace;color:#475569">${e.date.slice(5)}</span></li>`,
              ).join('') +
              '</ul>'}
        </td>
        <td style="width:33%;padding:0 8px;">
          <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px">Top exposure</p>
          ${inputs.topExposure.length === 0
            ? '<p style="font-size:13px;color:#94a3b8;margin:0">No portfolio loaded</p>'
            : '<ul style="list-style:none;padding:0;margin:0;font-size:13px">' +
              inputs.topExposure.map((x) =>
                `<li style="padding:4px 0;display:flex;justify-content:space-between"><span style="font-weight:600;color:#0f172a;text-transform:uppercase">${x.factor}</span><span style="font-family:ui-monospace,monospace;color:#475569">${(x.weight * 100).toFixed(0)}%</span></li>`,
              ).join('') +
              '</ul>'}
        </td>
      </tr>
    </table>
  `;

  // Escape the LLM-produced transcript before embedding so the
  // briefing text itself can't inject HTML if the model goes off-piste.
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#0f172a">
      <div style="margin-bottom:16px">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8">Daily Briefing</div>
        <h1 style="margin:4px 0 0;font-size:22px">${today}</h1>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:24px;font-size:15px;line-height:1.65;color:#1e293b;white-space:pre-wrap">${escapeHtml(inputs.transcript)}</div>
      ${inputsHtml}
      <p style="margin:32px 0 0;text-align:center">
        <a href="${dashboardUrl}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-size:13px">Open dashboard</a>
      </p>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px;text-align:center;line-height:1.5">
        Informational only — not investment advice.<br/>
        <a href="${APP_URL}/dashboard?tab=settings" style="color:#94a3b8">Manage briefing preferences</a>
      </p>
    </div>
  `;

  return { subject: `ChartSentinel briefing — ${today}`, html, text };
}

// --- watchlist alert -------------------------------------------------------

export type WatchlistAlertTrigger = {
  ticker: string;
  score: number;
  direction: 'above' | 'below';
  threshold: number;
};

export async function sendWatchlistAlertEmail(
  to: string,
  triggers: WatchlistAlertTrigger[],
) {
  const dashboardUrl = `${APP_URL}/dashboard?tab=signals`;

  const textLines = [
    'ChartSentinel — composite score alert',
    '',
    ...triggers.map(
      (t) =>
        `• ${t.ticker}: composite ${t.score.toFixed(2)} — crossed ${t.direction === 'above' ? 'above' : 'below'} ${t.threshold.toFixed(2)}`,
    ),
    '',
    `Open signals dashboard: ${dashboardUrl}`,
  ];

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0f172a">
      <h2 style="margin:0 0 8px;font-size:20px">Watchlist alert</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:13px">The following tickers crossed your configured thresholds.</p>
      <ul style="list-style:none;margin:0;padding:0;border-top:1px solid #eef2f7">
        ${triggers
          .map(
            (t) => `
          <li style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eef2f7">
            <span>
              <strong style="font-family:ui-monospace,SFMono-Regular,monospace">${t.ticker}</strong>
              <span style="color:#64748b;font-size:13px;margin-left:8px">${t.direction === 'above' ? 'above' : 'below'} ${t.threshold.toFixed(2)}</span>
            </span>
            <span style="font-family:ui-monospace,SFMono-Regular,monospace;font-weight:600;color:${t.direction === 'above' ? '#059669' : '#dc2626'}">${t.score.toFixed(2)}</span>
          </li>`,
          )
          .join('')}
      </ul>
      <p style="margin:24px 0">
        <a href="${dashboardUrl}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Open signals dashboard</a>
      </p>
      <p style="font-size:12px;color:#94a3b8">Not financial advice. See the Risk Disclaimer in your dashboard.</p>
    </div>
  `;

  await send({
    to,
    subject: `ChartSentinel — ${triggers.length} watchlist alert${triggers.length === 1 ? '' : 's'}`,
    html,
    text: textLines.join('\n'),
  });
}

function weeklyDigestTemplate(items: {
  reports: DigestItem[];
  news: DigestItem[];
}) {
  const weekEnding = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  const listText = (heading: string, list: DigestItem[]) =>
    list.length
      ? [
          '',
          heading,
          '-'.repeat(heading.length),
          ...list.map((it) => `• ${fmt(it.date)} — ${it.title}\n  ${it.url}`),
        ].join('\n')
      : '';

  const text = [
    `ChartSentinel — Weekly Digest — week ending ${weekEnding}`,
    '',
    listText('New reports this week', items.reports),
    listText('Market news', items.news),
    '',
    'Manage your preferences: ' + (process.env.APP_URL || '') + '/dashboard',
  ]
    .filter(Boolean)
    .join('\n');

  const listHtml = (heading: string, list: DigestItem[]) =>
    list.length
      ? `
      <h3 style="margin:32px 0 12px;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;color:#64748b">${heading}</h3>
      <ul style="list-style:none;margin:0;padding:0">
        ${list
          .map(
            (it) => `
          <li style="padding:14px 0;border-bottom:1px solid #eef2f7">
            <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">${fmt(it.date)}</div>
            <a href="${it.url}" style="color:#0f172a;text-decoration:none;font-weight:600;font-size:15px">${it.title}</a>
            ${it.summary ? `<p style="margin:6px 0 0;color:#475569;font-size:14px;line-height:1.55">${it.summary}</p>` : ''}
          </li>`,
          )
          .join('')}
      </ul>`
      : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#0f172a">
      <div style="text-align:center;margin-bottom:16px">
        <div style="display:inline-block;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8">Weekly Digest</div>
        <h1 style="margin:4px 0 0;font-size:22px">ChartSentinel</h1>
        <div style="font-size:13px;color:#64748b;margin-top:4px">Week ending ${weekEnding}</div>
      </div>

      ${listHtml('New reports this week', items.reports)}
      ${listHtml('Market news', items.news)}

      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;text-align:center">
        You're getting this because you subscribed to the ChartSentinel newsletter.
        <br/>
        <a href="${process.env.APP_URL || ''}/dashboard" style="color:#64748b">Manage preferences</a>
      </div>
    </div>
  `;

  return {
    subject: `ChartSentinel weekly — ${weekEnding}`,
    html,
    text,
  };
}
