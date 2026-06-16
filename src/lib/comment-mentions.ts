/**
 * Extracts the User ObjectId strings referenced by @mention chips in comment
 * HTML. The Tiptap mention extension renders each mention as a
 * `<span data-type="mention" data-id="<userId>">@Name</span>`; we pull the
 * `data-id` from every such span (attribute order-independent) and de-dupe.
 *
 * This is the single source of truth for who was mentioned — the server parses
 * the stored HTML rather than trusting a client-supplied list.
 */
export function extractMentionIds(html: string): string[] {
  if (typeof html !== 'string' || !html) return []

  const ids = new Set<string>()
  const spanRe = /<span\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = spanRe.exec(html))) {
    const tag = match[0]
    if (!/data-type\s*=\s*["']mention["']/i.test(tag)) continue
    const idMatch = tag.match(/data-id\s*=\s*["']([^"']+)["']/i)
    if (idMatch) ids.add(idMatch[1])
  }

  return Array.from(ids)
}
