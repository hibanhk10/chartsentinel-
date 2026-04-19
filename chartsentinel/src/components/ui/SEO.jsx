import { Helmet } from 'react-helmet-async';

// Per-route SEO helper. Drop into any page that wants its own <title> and
// OG/Twitter tags — falls through to the defaults in index.html when fields
// are omitted. Follows the "title — site" convention so search results read
// naturally (e.g. "Reset your password — ChartSentinel").

const SITE = 'ChartSentinel';
const CANONICAL_ORIGIN = 'https://www.chartsentinel.com';
const DEFAULT_OG_IMAGE = `${CANONICAL_ORIGIN}/og-image.png`;

export default function SEO({
  title,
  description,
  path = '',
  image,
  noindex = false,
}) {
  const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — Trading intelligence, without the noise.`;
  const url = `${CANONICAL_ORIGIN}${path}`;
  const img = image || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <link rel="canonical" href={url} />
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:url" content={url} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={img} />

      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
