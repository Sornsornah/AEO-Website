import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT ?? 587),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendOTPEmail(email: string, code: string) {
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER?.includes('@')) {
    console.log(`\n[DEV] OTP for ${email}: ${code}\n`)
    return
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? `"UpdateCentral" <noreply@updatecentral.com>`,
    to: email,
    subject: `Your sign-in code: ${code}`,
    text: `Your UpdateCentral sign-in code is: ${code}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px;">
        <div style="margin-bottom: 28px;">
          <div style="width: 40px; height: 40px; background: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="color: white; font-weight: bold; font-size: 18px;">U</span>
          </div>
          <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #0f172a;">Sign in to UpdateCentral</h1>
          <p style="margin: 6px 0 0; font-size: 14px; color: #64748b;">Use the code below to complete your sign-in.</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; font-weight: 600;">Your sign-in code</p>
          <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 0.15em; color: #0f172a; font-family: monospace;">${code}</p>
        </div>

        <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
          This code expires in <strong>10 minutes</strong>. If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  })
}
