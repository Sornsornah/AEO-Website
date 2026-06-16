export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

// Users that can be @mentioned in update comments: "Management" (viewer) and
// "AEO" (admin) roles only. Feeds the Tiptap mention autocomplete dropdown.
export async function GET(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session) return new Response(null, { status: 401 })

  await connectDB()

  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  const filter: Record<string, unknown> = { role: { $in: ['viewer', 'admin'] } }
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(safe, 'i')
    filter.$or = [{ name: rx }, { email: rx }]
  }

  // No limit: the Management/AEO pool is small and the dropdown scrolls, so the
  // full list of mentionable people should be available.
  const users = await User.find(filter).select('name email').sort({ name: 1 }).lean()

  return NextResponse.json(
    users.map((u) => {
      const { name, email } = u as { name?: string; email: string }
      return {
        id: u._id.toString(),
        // `label` is what the inserted chip shows (@label); `email` is shown in
        // the autocomplete dropdown as "Name - Email".
        label: name || email,
        email,
      }
    })
  )
}
