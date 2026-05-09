import { createHash } from 'node:crypto';

// Public RSS/Atom feeds. Each fetch is independent so a slow or broken
// source doesn't stall the rest. We previously routed this through the
// rss2json proxy on the client; pulling server-side removes that
// rate-limited dep and gives us uniform shape + caching.
const SOURCES: ReadonlyArray<{ name: string; url: string; category: string }> = [
  { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Markets' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'Markets' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Markets' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto' },
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news.rss', category: 'Markets' },
];

const CACHE_TTL_MS = 10 * 60 * 1000;
const SOURCE_TIMEOUT_MS = 6_000;
const MAX_ARTICLES = 30;
const MAX_PER_SOURCE = 8;

export interface NewsArticle {
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

let cache: { value: NewsArticle[]; expires: number } | null = null;

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

// Pulls the first matching tag's inner text. RSS schemas use bare tags;
// Atom adds attributes — the optional `[^>]*` swallows them either way.
function pickTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? stripCdata(m[1]) : null;
}

function pickAttr(xml: string, tag: string, attr: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?\\s${attr}="([^"]+)"`));
  return m ? m[1] : null;
}

function findImage(xml: string, description: string | null): string | null {
  // Try the structured paths first; description-embedded <img> is the fallback.
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

function toIsoDate(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function articleId(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 16);
}

function parseFeed(xml: string, source: string, defaultCategory: string): NewsArticle[] {
  // Atom uses <entry>; RSS uses <item>. Both schemas live in the wild;
  // sniff once and pick the right block tag.
  const isAtom = xml.includes('<feed') && xml.includes('<entry');
  const blockTag = isAtom ? 'entry' : 'item';
  const items: NewsArticle[] = [];

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
      summary: description ? stripHtml(description).slice(0, 280) : '',
      publishedAt: toIsoDate(pub),
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

async function fetchSource(src: typeof SOURCES[number]): Promise<NewsArticle[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': 'ChartSentinel/1.0', Accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml' },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[news] ${src.name} ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseFeed(xml, src.name, src.category);
  } catch (err) {
    console.warn(`[news] ${src.name} failed`, (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveNews(): Promise<NewsArticle[]> {
  if (cache && cache.expires > Date.now()) return cache.value;

  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const all: NewsArticle[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  // De-dup by article id (URL hash) — separate sources sometimes carry the
  // same wire story under their own banner.
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
  deduped.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const top = deduped.slice(0, MAX_ARTICLES);
  cache = { value: top, expires: Date.now() + CACHE_TTL_MS };
  return top;
}

export async function findLiveArticleById(id: string): Promise<NewsArticle | null> {
  const list = await fetchLiveNews();
  return list.find((a) => a.id === id) ?? null;
}

// Test seam — lets unit tests reset the module cache between cases.
export function __resetCacheForTests(): void {
  cache = null;
}

// Test seam — direct access to the parser without the network round-trip.
export const __parseFeedForTests = parseFeed;
