import { Resend } from 'resend';
import env from '../config/env';

// Thin wrapper around Resend. If RESEND_API_KEY is unset the whole thing
// becomes a no-op that logs to stdout — which is the right behaviour for
// local dev (no surprise outbound emails) and for deployments that haven't
// wired Resend yet (boot doesn't fail, password reset endpoints just don't
// actually send mail).

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM = env.EMAIL_FROM || 'ChartSentinel <no-reply@chartsentinel.app>';
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
