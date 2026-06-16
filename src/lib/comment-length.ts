// Visible-text limit for comment prose.
export const MAX_VISIBLE_COMMENT_LENGTH = 1000

// Hard cap on the raw stored comment HTML, which can carry a pasted image/video
// as inline base64. Generous enough for a screenshot, but well under MongoDB's
// 16MB per-document limit so a save never blows up with a cryptic error.
export const MAX_COMMENT_LENGTH = 5_000_000

// The comment text limit is meant for human-readable prose. Comment HTML can
// also carry pasted images/videos as inline base64 `data:` URIs, which are huge
// but aren't "text". Measure only the visible text so a pasted image/video
// doesn't trip the length guard.
export function visibleCommentLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, '') // strip tags, incl. <img>/<video> with base64 src
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim().length
}
