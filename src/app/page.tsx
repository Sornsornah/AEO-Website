export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession(await headers())
  if (session) redirect('/updates')
  redirect('/login')
}
