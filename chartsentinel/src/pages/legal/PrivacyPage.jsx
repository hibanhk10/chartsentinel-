import LegalLayout from './LegalLayout';

// Practical privacy notice aligned with Kenya's Data Protection Act 2019,
// with enough GDPR / CCPA texture to not trip over EU / California users.
// Real legal review is recommended before launch.

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      path="/privacy"
      lastUpdated="19 April 2026"
      siblings={[
        { to: '/terms', label: 'Terms of Service' },
        { to: '/risk', label: 'Risk Disclaimer' },
      ]}
    >
      <Section title="1. Who we are">
        <p>
          ChartSentinel (&quot;we&quot;, &quot;us&quot;) runs the platform
          available at chartsentinel.app. For the purposes of Kenya&apos;s
          Data Protection Act 2019 and similar laws, we are the data
          controller of the personal information described below.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p>We collect three kinds of information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account data.</strong> Your email address, a hashed
            password, and the timestamp of your account creation. If you
            subscribe to a paid plan, Stripe additionally holds payment
            instrument details — we never see or store your full card
            number.
          </li>
          <li>
            <strong>Usage data.</strong> Pageviews, button clicks, and
            performance metrics collected via PostHog (product analytics)
            and Sentry (error tracking). This data helps us improve the
            product and diagnose bugs. Input fields on the site are masked
            before they are sent to third parties.
          </li>
          <li>
            <strong>Content you send us.</strong> Contact-form messages,
            newsletter subscriptions, and any other information you
            voluntarily provide.
          </li>
        </ul>
      </Section>

      <Section title="3. Why we use it">
        <ul className="list-disc pl-6 space-y-2">
          <li>To deliver and maintain the Service.</li>
          <li>To authenticate you and secure your account.</li>
          <li>To bill you for paid plans and prevent payment fraud.</li>
          <li>To send transactional emails (welcome, password reset, receipts, weekly digest if you subscribed).</li>
          <li>To understand how the product is used so we can improve it.</li>
          <li>To comply with legal obligations and enforce our Terms.</li>
        </ul>
      </Section>

      <Section title="4. Third-party processors">
        <p>We rely on a small, deliberately-chosen set of subprocessors:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Supabase</strong> — database and authentication storage
            (user and application data).
          </li>
          <li>
            <strong>Stripe</strong> — payment processing. Subject to Stripe&apos;s
            own privacy notice.
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery.
          </li>
          <li>
            <strong>Sentry</strong> — error and performance monitoring. We
            mask form inputs before events are sent.
          </li>
          <li>
            <strong>PostHog</strong> — product analytics. Session replay is
            disabled by default; inputs are masked; session recordings are
            not used on this product.
          </li>
          <li>
            <strong>Vercel / Railway</strong> — hosting and edge delivery.
          </li>
        </ul>
        <p>
          Each of these acts as a processor on our behalf under standard
          contractual terms. We do not sell your personal information to any
          third party for any purpose.
        </p>
      </Section>

      <Section title="5. Where data is stored">
        <p>
          Our primary database and backups live with Supabase in a region
          chosen to balance latency and resilience. Data may be transferred
          internationally where our processors are based outside Kenya;
          those transfers are covered by standard contractual clauses and
          each processor&apos;s compliance programme.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <p>
          Account data is retained for as long as your account is active.
          When you close an account, we delete or anonymise personal
          information within 30 days, except where retention is required for
          legal, accounting, or fraud-prevention reasons. Analytics events
          are retained for up to 12 months. Backups roll off naturally and
          are not accessed for any purpose other than disaster recovery.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>
          Depending on where you live, you may have the right to: access the
          personal information we hold about you; request that we correct
          it; request that we delete it; object to or restrict certain
          processing; and export it in a portable format. To exercise any of
          these rights, email{' '}
          <Anchor href="mailto:privacy@chartsentinel.app">
            privacy@chartsentinel.app
          </Anchor>{' '}
          from the address associated with your account. We aim to respond
          within 30 days.
        </p>
      </Section>

      <Section title="8. Cookies and similar tech">
        <p>
          We use strictly necessary cookies (login session, CSRF protection)
          and a small number of analytics cookies (PostHog). We do not use
          third-party advertising cookies, cross-site tracking, or
          fingerprinting. You can block cookies in your browser settings;
          doing so may break sign-in.
        </p>
      </Section>

      <Section title="9. Children">
        <p>
          ChartSentinel is not directed at children under 18 and we do not
          knowingly collect personal information from them. If you believe a
          minor has provided us with personal information, contact us and
          we&apos;ll delete it.
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          Passwords are hashed with bcrypt. Tokens are stored hashed, never
          in plaintext. Access to production systems is limited, audited,
          and enforced via MFA. Despite reasonable measures, no internet
          service is 100% secure — if we learn of a breach that affects
          you, we&apos;ll notify you and the relevant authorities as
          required by law.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We&apos;ll update this notice when our practices change. Material
          changes will be communicated by email and via the
          &quot;Last updated&quot; date above.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about this Privacy Policy or your data?{' '}
          <Anchor href="mailto:privacy@chartsentinel.app">
            privacy@chartsentinel.app
          </Anchor>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Anchor({ href, children }) {
  const isExternal = /^(mailto:|https?:)/.test(href);
  return (
    <a
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors mx-1"
    >
      {children}
    </a>
  );
}
