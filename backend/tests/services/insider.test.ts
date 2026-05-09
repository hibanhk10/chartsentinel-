import { describe, expect, it } from 'vitest';
import { parseForm4, detectClusterBuys, type InsiderTrade } from '../../src/services/insider.service';

// Minimal fixture mirroring the SEC Form 4 schema. Only the tags the parser
// reads are populated; whitespace + CRLF kept realistic since SEC's serialiser
// emits both.
function buyXml({
  ticker = 'AAPL',
  name = 'Tim Cook',
  shares = '1000',
  price = '150.00',
  ad = 'A',
  date = '2026-05-01',
  officer = true,
  director = false,
  tenpct = false,
  title = 'CEO',
} = {}): string {
  return `<?xml version="1.0"?>
<ownershipDocument>
  <issuer>
    <issuerTradingSymbol>${ticker}</issuerTradingSymbol>
  </issuer>
  <reportingOwner>
    <reportingOwnerId>
      <rptOwnerName>${name}</rptOwnerName>
    </reportingOwnerId>
    <reportingOwnerRelationship>
      <isOfficer>${officer ? '1' : '0'}</isOfficer>
      <isDirector>${director ? '1' : '0'}</isDirector>
      <isTenPercentOwner>${tenpct ? '1' : '0'}</isTenPercentOwner>
      <officerTitle>${title}</officerTitle>
    </reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <transactionDate><value>${date}</value></transactionDate>
      <transactionAmounts>
        <transactionShares><value>${shares}</value></transactionShares>
        <transactionPricePerShare><value>${price}</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>${ad}</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
</ownershipDocument>`;
}

const URL = 'https://www.sec.gov/Archives/edgar/data/0/0/x-index.htm';

describe('parseForm4', () => {
  it('parses a non-derivative buy transaction', () => {
    const t = parseForm4(buyXml(), URL);
    expect(t).not.toBeNull();
    expect(t!.ticker).toBe('AAPL');
    expect(t!.filer).toBe('Tim Cook');
    expect(t!.type).toBe('Buy');
    expect(t!.shares).toBe(1000);
    expect(t!.price).toBe(150);
    expect(t!.value).toBe(150_000);
    expect(t!.date).toBe('2026-05-01');
    expect(t!.isOfficer).toBe(true);
    expect(t!.officerTitle).toBe('CEO');
  });

  it('classifies disposed transactions as Sell', () => {
    const t = parseForm4(buyXml({ ad: 'D' }), URL);
    expect(t!.type).toBe('Sell');
  });

  it('filters out gifts and other zero-price events', () => {
    expect(parseForm4(buyXml({ price: '0' }), URL)).toBeNull();
  });

  it('returns null when no non-derivative transaction is present', () => {
    const xml = `<?xml version="1.0"?>
<ownershipDocument>
  <issuer><issuerTradingSymbol>NVDA</issuerTradingSymbol></issuer>
  <reportingOwner><reportingOwnerId><rptOwnerName>X</rptOwnerName></reportingOwnerId></reportingOwner>
  <derivativeTable><derivativeTransaction/></derivativeTable>
</ownershipDocument>`;
    expect(parseForm4(xml, URL)).toBeNull();
  });

  it('reads role flags written as `true` instead of `1`', () => {
    const xml = buyXml({ director: true, officer: false }).replace(
      '<isDirector>1</isDirector>',
      '<isDirector>true</isDirector>',
    );
    const t = parseForm4(xml, URL);
    expect(t!.isDirector).toBe(true);
  });

  it('falls back to periodOfReport when transactionDate is missing', () => {
    const xml = buyXml().replace(
      '<transactionDate><value>2026-05-01</value></transactionDate>',
      '',
    ).replace('</issuer>', '</issuer>\n<periodOfReport>2026-04-15</periodOfReport>');
    const t = parseForm4(xml, URL);
    expect(t!.date).toBe('2026-04-15');
  });

  it('handles tags with attributes (footnoteId etc.)', () => {
    const xml = buyXml().replace(
      '<transactionShares><value>1000</value></transactionShares>',
      '<transactionShares footnoteId="F1"><value>1000</value></transactionShares>',
    );
    const t = parseForm4(xml, URL);
    expect(t!.shares).toBe(1000);
  });

  it('returns null when shares or price cannot be parsed', () => {
    expect(parseForm4(buyXml({ shares: 'not-a-number' }), URL)).toBeNull();
  });
});

function fakeTrade(overrides: Partial<InsiderTrade>): InsiderTrade {
  return {
    filer: 'X',
    ticker: 'TEST',
    type: 'Buy',
    shares: 100,
    price: 10,
    value: 1000,
    date: '2026-05-01',
    formUrl: URL,
    officerTitle: null,
    isOfficer: true,
    isDirector: false,
    isTenPercentOwner: false,
    ...overrides,
  };
}

describe('detectClusterBuys', () => {
  it('flags tickers with ≥3 distinct buyers within the window', () => {
    const trades: InsiderTrade[] = [
      fakeTrade({ ticker: 'AAPL', filer: 'A', date: '2026-05-01', value: 1000 }),
      fakeTrade({ ticker: 'AAPL', filer: 'B', date: '2026-05-03', value: 2000 }),
      fakeTrade({ ticker: 'AAPL', filer: 'C', date: '2026-05-05', value: 3000 }),
    ];
    const clusters = detectClusterBuys(trades);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].ticker).toBe('AAPL');
    expect(clusters[0].buyerCount).toBe(3);
    expect(clusters[0].totalValue).toBe(6000);
  });

  it('ignores tickers below the buyer threshold', () => {
    const trades: InsiderTrade[] = [
      fakeTrade({ ticker: 'AAPL', filer: 'A' }),
      fakeTrade({ ticker: 'AAPL', filer: 'B' }),
    ];
    expect(detectClusterBuys(trades)).toHaveLength(0);
  });

  it('does not double-count a single buyer trading multiple times', () => {
    const trades: InsiderTrade[] = [
      fakeTrade({ ticker: 'AAPL', filer: 'A', date: '2026-05-01' }),
      fakeTrade({ ticker: 'AAPL', filer: 'A', date: '2026-05-02' }),
      fakeTrade({ ticker: 'AAPL', filer: 'A', date: '2026-05-03' }),
    ];
    expect(detectClusterBuys(trades)).toHaveLength(0);
  });

  it('rejects clusters whose date span exceeds the window', () => {
    const trades: InsiderTrade[] = [
      fakeTrade({ ticker: 'AAPL', filer: 'A', date: '2026-04-01' }),
      fakeTrade({ ticker: 'AAPL', filer: 'B', date: '2026-04-15' }),
      fakeTrade({ ticker: 'AAPL', filer: 'C', date: '2026-05-30' }),
    ];
    expect(detectClusterBuys(trades, 14, 3)).toHaveLength(0);
  });

  it('excludes sell trades from cluster scoring', () => {
    const trades: InsiderTrade[] = [
      fakeTrade({ ticker: 'AAPL', filer: 'A', type: 'Sell' }),
      fakeTrade({ ticker: 'AAPL', filer: 'B', type: 'Sell' }),
      fakeTrade({ ticker: 'AAPL', filer: 'C', type: 'Sell' }),
    ];
    expect(detectClusterBuys(trades)).toHaveLength(0);
  });

  it('sorts results by total value descending', () => {
    const trades: InsiderTrade[] = [
      fakeTrade({ ticker: 'SMALL', filer: 'A', value: 100 }),
      fakeTrade({ ticker: 'SMALL', filer: 'B', value: 100 }),
      fakeTrade({ ticker: 'SMALL', filer: 'C', value: 100 }),
      fakeTrade({ ticker: 'BIG', filer: 'X', value: 10_000 }),
      fakeTrade({ ticker: 'BIG', filer: 'Y', value: 10_000 }),
      fakeTrade({ ticker: 'BIG', filer: 'Z', value: 10_000 }),
    ];
    const clusters = detectClusterBuys(trades);
    expect(clusters.map((c) => c.ticker)).toEqual(['BIG', 'SMALL']);
  });
});
