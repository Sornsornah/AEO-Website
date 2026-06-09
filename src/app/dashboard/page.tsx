export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/layout/navbar'
import { DashboardClient } from '@/features/dashboard/components/dashboard-client'

export default async function DashboardPage() {
  const session = await getSession(await headers())
  if (!session || session.user.role !== 'admin') redirect('/updates')

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-sm text-slate-500">Success metrics across acquisition, activation, retention, and referral.</p>
        </div>

        <DashboardClient />
      </main>
    </div>
  )
}
