import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { PageSetting } from '@/models/PageSetting'

const SEED_PAGE_SETTINGS = [
  {
    pageKey: 'about',
    label: 'About Us',
    href: '/about',
    navEnabled: true,
    order: 0,
    bannerEnabled: false,
    bannerText: '',
    bannerStyle: 'warning',
    adminOnly: false,
  },
  {
    pageKey: 'products',
    label: 'Products',
    href: '/products',
    navEnabled: true,
    order: 1,
    bannerEnabled: false,
    bannerText: '',
    bannerStyle: 'warning',
    adminOnly: false,
  },
  {
    pageKey: 'blog',
    label: 'Blog',
    href: '/blog',
    navEnabled: true,
    order: 2,
    bannerEnabled: false,
    bannerText: '',
    bannerStyle: 'warning',
    adminOnly: false,
  },
  {
    pageKey: 'updates',
    label: 'Internal Updates',
    href: '/updates',
    navEnabled: true,
    order: 3,
    bannerEnabled: true,
    bannerText: 'Restricted Access — this page is intended for authorised internal users only.',
    bannerStyle: 'warning',
    adminOnly: true,
  },
]

export async function GET() {
  await connectDB()

  const count = await PageSetting.countDocuments()
  if (count === 0) {
    await PageSetting.insertMany(SEED_PAGE_SETTINGS)
  }

  // Ensure no entry with a dynamic route pattern is shown in the nav
  await PageSetting.updateMany({ href: /\[/ }, { $set: { navEnabled: false } })

  const settings = await PageSetting.find().sort({ order: 1 }).lean()
  return NextResponse.json(settings)
}
