import DOMPurify from 'isomorphic-dompurify'

// Allowlist matching exactly what the Tiptap blog editor can produce
// (StarterKit + Underline + Link + Image[allowBase64] + the custom <video> node).
// Anything outside this set — scripts, event handlers, iframes, etc. — is stripped.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li',
  'a', 'img', 'video',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title', 'controls', 'class']

// Sanitises Tiptap/HTML blog content before it is stored, so that any
// authenticated author (incl. non-admins) cannot persist stored XSS.
// DOMPurify also neutralises javascript:/data: script URIs in href/src.
export function sanitizeBlogHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Disallow data: URIs everywhere except base64 images, which the editor
    // emits via Image.configure({ allowBase64: true }).
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  })
}
