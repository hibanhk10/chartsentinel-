import { describe, expect, it } from 'vitest';
import { __parseFeedForTests as parseFeed } from '../../src/services/news-feed.service';

const RSS_FIXTURE = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Example</title>
    <item>
      <title><![CDATA[Markets close higher]]></title>
      <link>https://example.com/a</link>
      <description><![CDATA[<p>Stocks rose <b>2%</b>.</p><img src="https://img/a.jpg"/>]]></description>
      <pubDate>Mon, 06 May 2026 14:32:00 GMT</pubDate>
      <author>Jane Doe</author>
      <category>Markets</category>
    </item>
    <item>
      <title>Plain title</title>
      <link>https://example.com/b</link>
      <description>Short summary.</description>
      <pubDate>Sun, 05 May 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom story</title>
    <link href="https://atom.example/x" />
    <published>2026-05-06T12:00:00Z</published>
    <summary>Atom summary text</summary>
    <author><name>Atom Author</name></author>
  </entry>
</feed>`;

describe('parseFeed', () => {
  it('parses an RSS feed and strips HTML from descriptions', () => {
    const items = parseFeed(RSS_FIXTURE, 'Example', 'Markets');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Markets close higher');
    expect(items[0].summary).toBe('Stocks rose 2%.');
    expect(items[0].author).toBe('Jane Doe');
    expect(items[0].category).toBe('Markets');
    expect(items[0].url).toBe('https://example.com/a');
  });

  it('extracts an embedded image from description when no media tag is present', () => {
    const items = parseFeed(RSS_FIXTURE, 'Example', 'Markets');
    expect(items[0].imageUrl).toBe('https://img/a.jpg');
  });

  it('falls back to the source name when author is missing', () => {
    const items = parseFeed(RSS_FIXTURE, 'Example', 'Markets');
    expect(items[1].author).toBe('Example');
  });

  it('produces stable ids based on the article URL', () => {
    const a = parseFeed(RSS_FIXTURE, 'Example', 'Markets');
    const b = parseFeed(RSS_FIXTURE, 'Example', 'Markets');
    expect(a[0].id).toBe(b[0].id);
    expect(a[0].id).not.toBe(a[1].id);
  });

  it('normalises pubDate into ISO 8601', () => {
    const items = parseFeed(RSS_FIXTURE, 'Example', 'Markets');
    expect(items[0].publishedAt).toBe('2026-05-06T14:32:00.000Z');
  });

  it('parses Atom feeds via <entry>/<link href> + <published>', () => {
    const items = parseFeed(ATOM_FIXTURE, 'AtomSrc', 'Tech');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Atom story');
    expect(items[0].url).toBe('https://atom.example/x');
    expect(items[0].publishedAt).toBe('2026-05-06T12:00:00.000Z');
    expect(items[0].summary).toBe('Atom summary text');
  });

  it('uses the default category when the item has none', () => {
    const items = parseFeed(ATOM_FIXTURE, 'AtomSrc', 'Tech');
    expect(items[0].category).toBe('Tech');
  });

  it('prefers media:thumbnail over description-embedded images', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel><item>
<title>Markets thumbnail check</title>
<link>https://x/y</link>
<description><![CDATA[<img src="https://wrong.jpg"/>]]></description>
<media:thumbnail url="https://right.jpg"/>
<pubDate>Mon, 06 May 2026 00:00:00 GMT</pubDate>
</item></channel></rss>`;
    const items = parseFeed(xml, 'S', 'C');
    expect(items[0].imageUrl).toBe('https://right.jpg');
  });

  it('decodes common HTML entities in titles', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel><item>
<title>S&amp;P 500 closes &quot;higher&quot;</title>
<link>https://x/z</link>
<pubDate>Mon, 06 May 2026 00:00:00 GMT</pubDate>
</item></channel></rss>`;
    const items = parseFeed(xml, 'S', 'C');
    expect(items[0].title).toBe('S&P 500 closes "higher"');
  });

  it('decodes hex entities so apostrophes do not render as raw codes', () => {
    // &#x2019; = curly right single quote. Used by Yahoo / CoinDesk
    // for "Trump's"-style possessives. Before hex decoding was added
    // these rendered as literal "Trump&#x2019;s" on news cards —
    // numbers and codes leaking into the UI.
    const xml = `<?xml version="1.0"?>
<rss><channel><item>
<title>Trump&#x2019;s tariffs spike copper</title>
<link>https://x/copper</link>
<pubDate>Mon, 06 May 2026 00:00:00 GMT</pubDate>
</item></channel></rss>`;
    const items = parseFeed(xml, 'S', 'C');
    expect(items[0].title).toBe('Trump’s tariffs spike copper');
  });

  it('rejects taxonomy-id titles (numeric-only) instead of rendering "12345"', () => {
    // Some publishers stuff a CMS taxonomy id into <title> for sub-
    // rows. Reject those so a card never shows up titled "12345".
    const xml = `<?xml version="1.0"?>
<rss><channel>
<item><title>12345</title><link>https://x/1</link><pubDate>Mon, 06 May 2026 00:00:00 GMT</pubDate></item>
<item><title>Markets close higher</title><link>https://x/2</link><pubDate>Mon, 06 May 2026 00:00:00 GMT</pubDate></item>
</channel></rss>`;
    const items = parseFeed(xml, 'S', 'C');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Markets close higher');
  });

  it('falls back to the source category when the feed emits a numeric one', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel><item>
<title>Markets headline of the day</title>
<link>https://x/y</link>
<category>9876</category>
<pubDate>Mon, 06 May 2026 00:00:00 GMT</pubDate>
</item></channel></rss>`;
    const items = parseFeed(xml, 'S', 'Markets');
    expect(items[0].category).toBe('Markets');
  });
});
