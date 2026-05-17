export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { BlogCategory } from '@/models/BlogCategory'

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function GET(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await connectDB()
  const categories = await BlogCategory.find().sort({ name: 1 }).lean()
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req.headers)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await connectDB()

  const { name, purpose, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!color?.trim()) return NextResponse.json({ error: 'Color is required' }, { status: 400 })

  const slug = slugify(name)
  const existing = await BlogCategory.findOne({ slug })
  if (existing) return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })

  const category = await BlogCategory.create({ name: name.trim(), slug, purpose: purpose?.trim() || undefined, color: color.trim() })
  return NextResponse.json(category, { status: 201 })
}
