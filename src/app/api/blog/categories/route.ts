export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { BlogCategory } from '@/models/BlogCategory'

export async function GET() {
  await connectDB()
  const categories = await BlogCategory.find().sort({ name: 1 }).lean()
  return NextResponse.json(categories)
}
