// Tags worth preserving so the email mirrors how the comment renders in-app:
// lists, bold/italic/underline/strike, links, paragraphs and line breaks. These
// are plain, widely-supported tags that survive Postman's own XSS sanitiser.
const EMAIL_ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'span'])

// Postman's email sanitiser strips <s>/<del>/<strike> outright, so Tiptap's
// strikethrough would arrive as plain text. It does allow <span> with a `style`
// attribute, so we render strikethrough as an inline-styled span instead.
const STRIKE_TAGS = new Set(['s', 'del', 'strike'])

// Re-emit a single tag from the comment HTML: drop anything outside the
// allowlist (keeping its inner text), and strip attributes from what's kept.
// Anchors keep only an http(s)/mailto href so a `javascript:` URL can't ride in.
function filterTag(_full: string, slash: string, rawName: string, attrs: string): string {
  const name = rawName.toLowerCase()
  if (STRIKE_TAGS.has(name)) {
    return slash ? '</span>' : '<span style="text-decoration: line-through">'
  }
  if (!EMAIL_ALLOWED_TAGS.has(name)) return ''
  if (slash) return `</${name}>`
  if (name === 'a') {
    const m = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs)
    const url = m ? (m[2] ?? m[3] ?? m[4] ?? '') : ''
    if (/^(https?:|mailto:)/i.test(url)) {
      return `<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">`
    }
    return '<a>'
  }
  return `<${name}>`
}

// Email can't reliably show a comment's images (they're GridFS-hosted behind
// auth, and inlining base64 would bloat the email / get blocked by the WAF), so
// each image is swapped for a note pointing back to the update on the site.
const IMAGE_NOTE = '<p><em>(Image removed - refer to update in website for image)</em></p>'
const VIDEO_NOTE = '<p><em>(Video removed - refer to update in website for video)</em></p>'

// Turn the stored comment HTML (Tiptap) into formatting-preserving email HTML.
// Media is replaced/dropped first so it doesn't bloat the email or leave broken
// tags; the remaining markup is then narrowed to the formatting allowlist above.
// Text content is already HTML-escaped by Tiptap, so it's passed through as-is.
function commentHtmlForEmail(commentText: string): string {
  const clean = commentText
    .replace(/<img\b[^>]*\/?>/gi, IMAGE_NOTE)
    .replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, VIDEO_NOTE)
    .replace(/<video\b[^>]*\/?>/gi, VIDEO_NOTE)
    .replace(/<(source|iframe|picture|audio)\b[^>]*\/?>/gi, '')
    .replace(/<\/(iframe|picture|audio)>/gi, '')
    .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, filterTag)
    // De-nest the note if the image sat inside its own paragraph (<p><img></p>
    // → <p><p>…</p></p>): collapse the doubled open/close paragraph tags.
    .replace(/<p>\s*<p>/gi, '<p>')
    .replace(/<\/p>\s*<\/p>/gi, '</p>')
    // Collapse consecutive identical media notes (e.g. several images in a row).
    .replace(/(<p><em>\((?:Image|Video) removed[^<]*<\/em><\/p>)(?:\s*\1)+/gi, '$1')
    // Drop empty paragraph shells Tiptap leaves behind so they don't show as
    // blank lines.
    .replace(/<p>(\s|&nbsp;)*<\/p>/gi, '')
    .trim()

  // An empty body is rejected by Postman after its own sanitisation, so fall
  // back to a label when nothing renderable is left.
  return clean || '<p><em>(shared an attachment)</em></p>'
}

// Escape data interpolated into the email's HTML shell (commenter name, update
// title) so a stray < or & can't break the markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendCommentNotificationEmail(
  to: string,
  commenterName: string,
  updateTitle: string,
  updateId: string,
  commentText: string
) {
  const apiKey = process.env.POSTMAN_API_KEY
  if (!apiKey) return

  const appUrl = process.env.APP_URL ?? ''
  const updateUrl = `${appUrl}/updates?comments=${updateId}`
  const commentHtml = commentHtmlForEmail(commentText)
  const safeName = escapeHtml(commenterName)
  const safeTitle = escapeHtml(updateTitle)

  await fetch('https://api.postman.gov.sg/v1/transactional/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      subject: `[AEO Internal Updates] Activity: ${commenterName} commented on ${updateTitle}`,
      // The comment is block-level HTML (lists/paragraphs), so it sits between
      // the intro and footer paragraphs rather than being wrapped in a <p>.
      body: `<p>${safeName} left a comment on "${safeTitle}":</p>${commentHtml}<br><p>View the update: <a href="${updateUrl}">${updateUrl}</a></p>`,
      recipient: to,
    }),
  })
}
