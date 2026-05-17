export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { GridFSBucket, ObjectId } = mongoose.mongo
  let fileId: InstanceType<typeof ObjectId>
  try {
    fileId = new ObjectId(id)
  } catch {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  await connectDB()
  const db = mongoose.connection.db!
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' })

  const files = await bucket.find({ _id: fileId }).toArray()
  if (!files.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const file = files[0]
  const downloadStream = bucket.openDownloadStream(fileId)

  const chunks: Buffer[] = []
  for await (const chunk of downloadStream) {
    chunks.push(Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks)

  return new NextResponse(body, {
    headers: {
      'Content-Type': (file.metadata as { contentType?: string } | null)?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(body.length),
    },
  })
}
