import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const users = await User.find({ isWhitelisted: true }).select('_id name').lean()

  return NextResponse.json(
    users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
    }))
  )
}
