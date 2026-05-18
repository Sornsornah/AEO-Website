function stripMedia(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<(img|video|source|iframe|picture|audio)\b[^>]*\/?>/gi, '')
    .replace(/<\/(video|iframe|picture|audio)>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
  const cleanText = stripMedia(commentText)

  await fetch('https://api.postman.gov.sg/v1/transactional/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      subject: `[AEO Internal Updates] Activity: ${commenterName} commented on ${updateTitle}`,
      body: `<p>${commenterName} left a comment on "${updateTitle}":</p><p>${cleanText}</p><br><p>View the update: <a href="${updateUrl}">${updateUrl}</a></p>`,
      recipient: to,
    }),
  })
}
