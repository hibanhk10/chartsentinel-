import LegalLayout from './LegalLayout';

// Trading risk disclosure. Written to be blunt and readable because that's
// what actually protects both the user and us — boilerplate legalese people
// skip over is worse than a clear warning they remember.

export default function RiskPage() {
  return (
    <LegalLayout
      title="Risk Disclaimer"
      path="/risk"
      lastUpdated="19 April 2026"
      siblings={[
        { to: '/terms', label: 'Terms of Service' },
        { to: '/privacy', label: 'Privacy Policy' },
      ]}
    >
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
        <p className="font-semibold text-amber-200 mb-2">
          Read this carefully.
        </p>
        <p className="text-amber-100/90">
          Nothing on ChartSentinel is financial advice. Trading leveraged
          instruments can lose you more than you invest. If you act on
          anything you see here without your own research and
          risk-management plan, that&apos;s your decision and your exposure.
        </p>
      </div>

      <Section title="1. Not financial advice">
        <p>
          ChartSentinel is an information and analytics product. We publish
          tools, scores, reports, and commentary about markets. We are not
          a broker, not an investment adviser, not a financial planner, and
          not a fiduciary. Nothing on the Service is a personal
          recommendation, an offer, or a solicitation to buy or sell any
          security, derivative, commodity, digital asset, or other
          financial instrument.
        </p>
      </Section>

      <Section title="2. Do your own research">
        <p>
          Every signal, score, report, and chart on the platform reflects
          patterns in historical or real-time data — nothing more. Markets
          are non-stationary; patterns that held yesterday can fail today.
          Before you act on anything you see here, verify it with
          independent sources, check your broker&apos;s data, and
          consider talking to a licensed financial adviser in your
          jurisdiction.
        </p>
      </Section>

      <Section title="3. Past performance, future performance">
        <p>
          Any backtest, returns chart, or win-rate statistic on the Service
          is a description of what already happened. It is not a prediction,
          a guarantee, or a promise of what will happen. Real live trading
          introduces slippage, spreads, financing costs, liquidity
          constraints, and behavioural pressure that backtests do not
          capture.
        </p>
      </Section>

      <Section title="4. Leverage, margin, and derivatives">
        <p>
          Trading on margin or via derivatives (CFDs, futures, options,
          perps, etc.) can result in losses that exceed your deposit. A
          small adverse move can close out a leveraged position and trigger
          further margin calls. If you do not fully understand how leverage
          works on your broker&apos;s platform — including liquidation
          thresholds, funding rates, and overnight fees — do not use it.
        </p>
      </Section>

      <Section title="5. Crypto-specific risk">
        <p>
          Digital assets are highly volatile, largely unregulated, and
          subject to counterparty, custodial, and protocol-level risks that
          traditional markets do not have. Exchanges can halt withdrawals,
          stablecoins can de-peg, smart contracts can be exploited,
          airdrops can be taxed, and private keys once lost cannot be
          recovered. Assume that funds you allocate here can go to zero.
        </p>
      </Section>

      <Section title="6. Data accuracy">
        <p>
          We take reasonable care to source and display market data
          accurately, but we do not guarantee that any price, indicator,
          chart pattern, news item, or signal on the Service is complete,
          current, or free from error. Upstream feeds go down, APIs change,
          and historical data gets revised. Never place a real trade on the
          strength of a number you saw only on ChartSentinel.
        </p>
      </Section>

      <Section title="7. Your own suitability">
        <p>
          You are solely responsible for deciding whether any strategy,
          instrument, or market covered on the Service is appropriate for
          you in light of your financial situation, investment objectives,
          risk tolerance, tax position, and the laws that apply where you
          live.
        </p>
      </Section>

      <Section title="8. No compensation in the event of a loss">
        <p>
          ChartSentinel will not compensate you for any trading loss —
          realised or unrealised — taken on the basis of content, data,
          tools, or commentary published on the Service. See the Limitation
          of Liability clause in the{' '}
          <Anchor href="/terms">Terms of Service</Anchor> for the full
          wording.
        </p>
      </Section>

      <Section title="9. Regulatory status">
        <p>
          ChartSentinel is not licensed or registered with any financial
          regulator in any jurisdiction. If your jurisdiction requires
          financial-advisory services to be provided only by licensed
          parties, you should not interpret anything on this Service as
          advice covered by that regime.
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
