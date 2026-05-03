// Escape HTML-like tags in a markdown string so they render as literal text.
// Only <u> / </u> is allowed through — it is intentionally stored for underline.
const SAFE_TAG = /^<\/?u(\s[^>]*)?>$/i

export function sanitizeMarkdown(md: string): string {
  return md.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) =>
    SAFE_TAG.test(tag) ? tag : tag.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  )
}
