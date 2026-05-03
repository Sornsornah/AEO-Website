export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/about')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">AEO</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to view product updates</p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
