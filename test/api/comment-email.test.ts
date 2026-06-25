import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendCommentNotificationEmail } from '@/lib/email'

// Capture the request body sent to the Postman email API.
function lastEmailBody(): string {
  const fetchMock = vi.mocked(global.fetch)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const init = fetchMock.mock.calls[0][1] as RequestInit
  const payload = JSON.parse(init.body as string)
  return payload.body as string
}

describe('sendCommentNotificationEmail body formatting', () => {
  beforeEach(() => {
    process.env.POSTMAN_API_KEY = 'test-key'
    process.env.APP_URL = 'https://app.example'
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('preserves the ordered list and inline formatting from the comment', async () => {
    const comment =
      '<ol><li><p>werewr</p></li><li><p>ERER</p><ol><li><p>testing</p></li></ol></li>' +
      '<li><p><strong>bold</strong></p></li><li><p><em>italic</em></p></li>' +
      '<li><p><u>underline</u></p></li><li><p><s>strikethrough</s></p></li></ol>'

    await sendCommentNotificationEmail('to@x.com', 'Jason LEK', 'flowCentral product updates', 'abc123', comment)

    const body = lastEmailBody()
    expect(body).toContain('<ol>')
    expect(body).toContain('<li>')
    expect(body).toContain('<strong>bold</strong>')
    expect(body).toContain('<em>italic</em>')
    expect(body).toContain('<u>underline</u>')
    // Postman strips <s>/<del>, so strikethrough is rendered as a styled span.
    expect(body).toContain('<span style="text-decoration: line-through">strikethrough</span>')
    expect(body).not.toContain('<s>')
    // Must not flatten the list into a single run of text.
    expect(body).not.toContain('werewrERERtesting')
  })

  it('keeps the comment HTML out of the surrounding paragraph wrapper', async () => {
    await sendCommentNotificationEmail('to@x.com', 'Jason', 'Title', 'abc123', '<ol><li><p>one</p></li></ol>')
    const body = lastEmailBody()
    // Block-level list must not be nested inside a <p> (invalid, breaks rendering).
    expect(body).not.toMatch(/<p>\s*<ol>/i)
  })

  it('replaces an image with a note and keeps surrounding text', async () => {
    const comment = '<p>see this</p><img src="data:image/png;base64,AAAA"><p>photo</p>'
    await sendCommentNotificationEmail('to@x.com', 'Jason', 'Title', 'abc123', comment)
    const body = lastEmailBody()
    expect(body).not.toContain('<img')
    expect(body).not.toContain('base64')
    expect(body).toContain('see this')
    expect(body).toContain('photo')
    expect(body).toContain('(Image removed - refer to update in website for image)')
  })

  it('collapses several images in a row into a single note', async () => {
    const comment = '<img src="a.png"><img src="b.png"><img src="c.png">'
    await sendCommentNotificationEmail('to@x.com', 'Jason', 'Title', 'abc123', comment)
    const body = lastEmailBody()
    const matches = body.match(/\(Image removed - refer to update in website for image\)/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('renders a mention as its plain @label without data attributes', async () => {
    const comment = '<p>hi <span data-type="mention" data-id="000000000000000000000002">@Bob</span></p>'
    await sendCommentNotificationEmail('to@x.com', 'Jason', 'Title', 'abc123', comment)
    const body = lastEmailBody()
    expect(body).toContain('@Bob')
    expect(body).not.toContain('data-id')
  })

  it('shows the image note for an image-only comment without nesting paragraphs', async () => {
    await sendCommentNotificationEmail('to@x.com', 'Jason', 'Title', 'abc123', '<p><img src="x.png" /></p>')
    const body = lastEmailBody()
    expect(body).toContain('(Image removed - refer to update in website for image)')
    // The image's wrapping <p> must not nest the note's own <p>.
    expect(body).not.toMatch(/<p>\s*<p>/i)
  })

  it('does not send when no API key is configured', async () => {
    delete process.env.POSTMAN_API_KEY
    await sendCommentNotificationEmail('to@x.com', 'Jason', 'Title', 'abc123', '<p>hi</p>')
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled()
  })
})
