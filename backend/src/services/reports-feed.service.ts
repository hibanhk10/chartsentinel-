import { createHash } from 'node:crypto';

// Public analysis / commentary RSS. These are longer-form than the news
// feeds — opinion columns, market analysis pieces, weekly outlooks. We
// keep the parser identical to news-feed.service so the front-end
// consumer can render with the same shape; the only difference is the
// source list.

const SOURCES: ReadonlyArray<{ name: string; url: string; category: string }> = [
  { name: 'Investing.com Analysis', url: 'https://www.investing.com/rss/analysis.rss', category: 'Analysis' },
  { name: 'MarketWatch Top Stories', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Analysis' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'Markets' },
  { name: 'Reuters Markets', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best', category: 'Markets' },
  { name: 'CoinDesk Markets', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml', category: 'Crypto' },
];

const CACHE_TTL_MS = 30 * 60 * 1000; // longer than news — analysis isn't time-critical
const SOURCE_TIMEOUT_MS = 6_000;
const MAX_REPORTS = 18;
const MAX_PER_SOURCE = 5;

export interface ReportArticle {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  source: string;
  category: string;
  url: string;
  imageUrl: string | null;
  author: string;
}

let cache: { value: ReportArticle[]; expires: number } | null = null;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function stripCdata(s: string): string {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return (m ? m[1] : s).trim();
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function pickTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? stripCdata(m[1]) : null;
}

function pickAttr(xml: string, tag: string, attr: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?\\s${attr}="([^"]+)"`));
  return m ? m[1] : null;
}

function findImage(xml: string, description: string | null): string | null {
  const media = pickAttr(xml, 'media:thumbnail', 'url') ?? pickAttr(xml, 'media:content', 'url');
  if (media) return media;
  const enclosure = xml.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image\//);
  if (enclosure) return enclosure[1];
  if (description) {
    const img = description.match(/<img[^>]+src="([^"]+)"/);
    if (img) return img[1];
  }
  return null;
}

function toIso(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function articleId(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 16);
}

function parseFeed(xml: string, source: string, defaultCategory: string): ReportArticle[] {
  const isAtom = xml.includes('<feed') && xml.includes('<entry');
  const blockTag = isAtom ? 'entry' : 'item';
  const items: ReportArticle[] = [];

  const re = new RegExp(`<${blockTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${blockTag}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const titleRaw = pickTag(block, 'title');
    if (!titleRaw) continue;

    const link = isAtom
      ? pickAttr(block, 'link', 'href') ?? pickTag(block, 'id')
      : pickTag(block, 'link');
    if (!link) continue;

    const description = pickTag(block, 'description') ?? pickTag(block, 'summary') ?? pickTag(block, 'content');
    const pub = pickTag(block, 'pubDate') ?? pickTag(block, 'published') ?? pickTag(block, 'updated');
    const author = pickTag(block, 'author') ?? pickTag(block, 'dc:creator') ?? source;
    const category = pickTag(block, 'category') ?? defaultCategory;

    items.push({
      id: articleId(link),
      title: stripHtml(titleRaw),
      summary: description ? stripHtml(description).slice(0, 320) : '',
      publishedAt: toIso(pub),
      source,
      category: stripHtml(category) || defaultCategory,
      url: link.trim(),
      imageUrl: findImage(block, description),
      author: stripHtml(author),
    });

    if (items.length >= MAX_PER_SOURCE) break;
  }
  return items;
}

async function fetchSource(src: typeof SOURCES[number]): Promise<ReportArticle[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': 'ChartSentinel/1.0', Accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[reports] ${src.name} ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseFeed(xml, src.name, src.category);
  } catch (err) {
    console.warn(`[reports] ${src.name} failed`, (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveReports(): Promise<ReportArticle[]> {
  if (cache && cache.expires > Date.now()) return cache.value;
  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const all: ReportArticle[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  deduped.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const top = deduped.slice(0, MAX_REPORTS);
  cache = { value: top, expires: Date.now() + CACHE_TTL_MS };
  return top;
}

export async function findLiveReportById(id: string): Promise<ReportArticle | null> {
  const list = await fetchLiveReports();
  return list.find((a) => a.id === id) ?? null;
}

export const __parseFeedForTests = parseFeed;
