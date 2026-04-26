export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'
import { Readable } from 'stream'

const MAX_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File must be an image or video (JPEG, PNG, GIF, WebP, SVG, MP4, WebM, MOV)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 50MB limit' }, { status: 400 })
  }

  await connectDB()
  const db = mongoose.connection.db!

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .slice(0, 40)
  const filename = `${Date.now()}-${safeName}.${ext}`

  const bucket = new GridFSBucket(db, { bucketName: 'uploads' })
  const uploadStream = bucket.openUploadStream(filename, { metadata: { contentType: file.type } })

  await new Promise<void>((resolve, reject) => {
    const readable = Readable.from(buffer)
    readable.pipe(uploadStream)
    uploadStream.on('finish', resolve)
    uploadStream.on('error', reject)
  })

  return NextResponse.json({ url: `/api/uploads/${uploadStream.id}` })
}
