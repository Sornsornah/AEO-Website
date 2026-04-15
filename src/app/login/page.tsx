import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/updates')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">U</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">UpdateCentral</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to view product updates</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Access is restricted to authorized users only.
        </p>
      </div>
    </div>
  )
}
