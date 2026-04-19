import LegalLayout from './LegalLayout';

// These terms are a practical baseline for a trading-intelligence SaaS out of
// Kenya. They are NOT a substitute for review by a qualified lawyer before
// public launch — the limitation-of-liability and governing-law clauses in
// particular should be tuned to ChartSentinel's actual incorporation and
// target jurisdictions.

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      path="/terms"
      lastUpdated="19 April 2026"
      siblings={[
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/risk', label: 'Risk Disclaimer' },
      ]}
    >
      <Section title="1. Acceptance">
        <p>
          These Terms govern your access to and use of the ChartSentinel
          platform (the &quot;Service&quot;), operated by ChartSentinel
          (&quot;we&quot;, &quot;us&quot;). By creating an account, subscribing,
          or otherwise using the Service, you confirm that you have read,
          understood, and agreed to be bound by these Terms and by the
          <Anchor href="/privacy">Privacy Policy</Anchor> and
          <Anchor href="/risk">Risk Disclaimer</Anchor>.
        </p>
      </Section>

      <Section title="2. What ChartSentinel is">
        <p>
          ChartSentinel provides software tools, analytics, and educational
          content about financial markets — including chart-pattern detection,
          macro and sentiment scoring, seasonality views, and market reports.
        </p>
        <p>
          <strong>ChartSentinel is not a broker, dealer, investment adviser,
          or financial planner.</strong> Nothing on the Service is a
          recommendation, solicitation, or offer to buy or sell any security
          or financial instrument. See the
          <Anchor href="/risk">Risk Disclaimer</Anchor> for the full wording.
        </p>
      </Section>

      <Section title="3. Your account">
        <p>
          You must be at least 18 years old and legally able to enter into a
          binding contract in your jurisdiction. You are responsible for
          keeping your login credentials confidential and for all activity
          that happens through your account. Notify us immediately at
          <Anchor href="mailto:support@chartsentinel.com">
            support@chartsentinel.com
          </Anchor>
          if you suspect unauthorised access.
        </p>
      </Section>

      <Section title="4. Subscriptions and payments">
        <p>
          Paid plans are billed through Stripe. By subscribing you authorise
          us (via Stripe) to charge your payment method on a recurring basis
          until you cancel. Cancellation takes effect at the end of the
          current billing period — we do not issue pro-rated refunds for
          partial periods unless required by applicable law.
        </p>
        <p>
          Prices may change with at least 30 days&apos; notice. Continued use
          of the Service after a price change takes effect constitutes
          acceptance of the new price.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Share, resell, or redistribute the Service or any of its outputs.</li>
          <li>
            Scrape, reverse-engineer, or attempt to derive source code,
            models, or datasets from the Service.
          </li>
          <li>
            Use the Service to facilitate illegal activity, market
            manipulation, or fraud.
          </li>
          <li>
            Attempt to disrupt the Service, probe its security, or access
            data that is not your own.
          </li>
        </ul>
      </Section>

      <Section title="6. Intellectual property">
        <p>
          We retain all rights in the Service, including the software,
          branding, reports, charts, models, and any generated content not
          specifically attributed to you. We grant you a limited,
          non-exclusive, non-transferable, revocable licence to use the
          Service for your personal or internal business purposes while your
          account is active and in good standing.
        </p>
      </Section>

      <Section title="7. Disclaimers">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as
          available&quot;. To the maximum extent permitted by law, we
          disclaim all warranties, express or implied, including
          merchantability, fitness for a particular purpose, accuracy of
          financial data, and non-infringement. Market data on the platform
          may be delayed, incomplete, or incorrect — always verify critical
          information with your broker or a primary source before acting on
          it.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, ChartSentinel shall not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages — including trading losses, loss of profits, loss
          of data, or business interruption — arising out of or in connection
          with your use of the Service. Our total aggregate liability for any
          claim arising out of or in connection with the Service shall not
          exceed the total fees you paid us in the twelve (12) months
          immediately preceding the event giving rise to the claim.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate your account if you materially breach these Terms,
          misuse the Service, or fail to pay for a paid plan. On termination,
          your access ends immediately; sections that by their nature should
          survive termination (payment obligations, IP, disclaimers,
          limitation of liability, governing law) do survive.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These Terms are governed by and construed in accordance with the
          laws of the Republic of Kenya. Any dispute arising out of or in
          connection with these Terms shall be submitted to the exclusive
          jurisdiction of the courts of Nairobi, Kenya, unless local
          consumer-protection law grants you a non-waivable right to sue in
          your jurisdiction of residence.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update these Terms from time to time. If we make a material
          change we&apos;ll notify you by email (to the address on your
          account) and update the &quot;Last updated&quot; date above.
          Continued use of the Service after the effective date of a revised
          version constitutes acceptance.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about these Terms?{' '}
          <Anchor href="mailto:support@chartsentinel.com">
            support@chartsentinel.com
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
