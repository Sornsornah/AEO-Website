import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { OTP } from '@/models/OTP'
import { sendOTPEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  await connectDB()

  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user || !user.isWhitelisted) {
    // Return success to avoid leaking whether the email exists
    return NextResponse.json({ ok: true })
  }

  // Rate-limit: block if a valid unused OTP was sent in the last 60 seconds
  const recent = await OTP.findOne({
    email: email.toLowerCase(),
    used: false,
    expiresAt: { $gt: new Date() },
    createdAt: { $gt: new Date(Date.now() - 60_000) },
  })
  if (recent) {
    return NextResponse.json({ error: 'Please wait before requesting a new code.' }, { status: 429 })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const hashedCode = await bcrypt.hash(code, 10)

  await OTP.create({
    email: email.toLowerCase(),
    code: hashedCode,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  try {
    await sendOTPEmail(email, code)
  } catch (err) {
    console.error('Failed to send OTP email:', err)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
