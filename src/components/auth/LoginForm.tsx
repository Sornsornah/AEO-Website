'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send code. Try again.')
        return
      }

      setStep('otp')
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      otp,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid or expired code. Please try again.')
    } else {
      router.push('/updates')
      router.refresh()
    }
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div className="text-center pb-1">
          <p className="text-sm text-slate-600">
            We sent a 6-digit code to
          </p>
          <p className="text-sm font-medium text-slate-900">{email}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="otp" className="text-sm font-medium text-slate-700">
            Sign-in code
          </Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
            autoComplete="one-time-code"
            className="h-10 text-center text-lg tracking-widest font-mono"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {loading ? 'Verifying...' : 'Verify code'}
        </Button>

        <button
          type="button"
          onClick={() => { setStep('email'); setOtp(''); setError('') }}
          className="w-full text-xs text-slate-400 hover:text-slate-600 text-center"
        >
          Use a different email
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequestOTP} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          autoComplete="email"
          className="h-10"
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        {loading ? 'Sending code...' : 'Send sign-in code'}
      </Button>
    </form>
  )
}
