// Minimal Markdown subset parser tailored to CHANGELOG.md.
// Recognised forms (anything else falls through as plain text):
//   ## [version] — date         → release header
//   ### Heading                  → section
//   - bullet text                → list item (continuation lines join)
//   **bold** *italic* `code`     → inline emphasis
//   [text](url)                  → links
//
// Pulling in a full Markdown lib for one curated file would be overkill;
// the parser stays self-contained so adding a release in CHANGELOG.md
// requires no other code change.

const RELEASE_RE = /^##\s+\[?([^\]\s]+)\]?\s+[—–-]\s+(\d{4}-\d{2}-\d{2})/

export function parseChangelog(md) {
    const lines = md.split('\n')
    const releases = []
    let intro = ''
    let current = null
    let section = null
    let bullet = null

    const finishBullet = () => {
        if (bullet && section) section.items.push(bullet)
        bullet = null
    }
    const finishSection = () => {
        finishBullet()
        if (section && current) current.sections.push(section)
        section = null
    }
    const finishRelease = () => {
        finishSection()
        if (current) releases.push(current)
        current = null
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trimEnd()
        const releaseMatch = trimmed.match(RELEASE_RE)

        if (releaseMatch) {
            finishRelease()
            current = {
                version: releaseMatch[1],
                date: releaseMatch[2],
                sections: [],
                summary: '',
            }
            section = { title: 'General', items: [] }
            continue
        }

        if (trimmed.startsWith('### ')) {
            finishSection()
            section = { title: trimmed.slice(4).trim(), items: [] }
            continue
        }

        if (trimmed.startsWith('# ')) continue // top-level title — ignored

        if (trimmed.startsWith('- ')) {
            finishBullet()
            bullet = trimmed.slice(2)
            continue
        }

        // Continuation line for the current bullet (indented or non-empty
        // line right after a bullet without a blank gap).
        if (bullet !== null && (line.startsWith('  ') || line.startsWith('\t'))) {
            bullet += ' ' + trimmed.trim()
            continue
        }

        if (trimmed === '') {
            finishBullet()
            continue
        }

        // Plain prose — first prose paragraph below a release header
        // becomes its summary.
        if (current && !current.summary && section?.items?.length === 0) {
            current.summary = current.summary
                ? current.summary + ' ' + trimmed.trim()
                : trimmed.trim()
        } else if (!current) {
            intro = intro ? intro + ' ' + trimmed.trim() : trimmed.trim()
        }
    }
    finishRelease()
    return { intro, releases }
}

// Inline markdown renderer for a single string. Intentionally limited:
// only bold, italic, code, and links.
export function renderInline(text) {
    if (!text) return null
    const parts = []
    const re = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
    let last = 0
    let m
    let key = 0
    while ((m = re.exec(text))) {
        if (m.index > last) parts.push(text.slice(last, m.index))
        const tok = m[1]
        if (tok.startsWith('[')) {
            const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
            if (link) {
                parts.push({ type: 'link', text: link[1], href: link[2], key: key++ })
            } else {
                parts.push(tok)
            }
        } else if (tok.startsWith('**')) {
            parts.push({ type: 'bold', text: tok.slice(2, -2), key: key++ })
        } else if (tok.startsWith('*')) {
            parts.push({ type: 'italic', text: tok.slice(1, -1), key: key++ })
        } else if (tok.startsWith('`')) {
            parts.push({ type: 'code', text: tok.slice(1, -1), key: key++ })
        }
        last = m.index + tok.length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts
}
