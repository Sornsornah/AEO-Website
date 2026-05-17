'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'email' | 'code'

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

const codeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
})

type EmailFormValues = z.infer<typeof emailSchema>
type CodeFormValues = z.infer<typeof codeSchema>

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  async function handleEmailSubmit(values: EmailFormValues) {
    setServerError('')
    setLoading(true)

    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email: values.email,
      type: 'sign-in',
    })

    setLoading(false)

    if (err) {
      setServerError('This email is not authorised to access this app.')
    } else {
      setEmail(values.email)
      setStep('code')
    }
  }

  async function handleCodeSubmit(values: CodeFormValues) {
    setServerError('')
    setLoading(true)

    const { data: session, error: err } = await authClient.signIn.emailOtp({
      email,
      otp: values.code,
    })

    setLoading(false)

    if (err || !session) {
      setServerError('Invalid or expired code. Please try again.')
    } else {
      const role = (session.user as { role?: string }).role
      router.push(role === 'admin' ? '/editor' : '/updates')
    }
  }

  return step === 'email' ? (
    <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          className="h-10"
          autoFocus
          {...emailForm.register('email')}
        />
        {emailForm.formState.errors.email && (
          <p className="text-xs text-red-600">{emailForm.formState.errors.email.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        {loading ? 'Sending code...' : 'Send code'}
      </Button>
    </form>
  ) : (
    <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code" className="text-sm font-medium text-slate-700">
          Sign-in code
        </Label>
        <p className="text-xs text-muted-foreground">
          A 6-digit code was sent to {email}.
        </p>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          autoFocus
          className="h-10 tracking-widest text-center text-lg font-mono"
          {...codeForm.register('code', {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/\D/g, '')
              codeForm.setValue('code', e.target.value)
            },
          })}
        />
        {codeForm.formState.errors.code && (
          <p className="text-xs text-red-600">{codeForm.formState.errors.code.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        {loading ? 'Verifying...' : 'Sign in'}
      </Button>

      <button
        type="button"
        onClick={() => { setStep('email'); codeForm.reset(); setServerError('') }}
        className="w-full text-xs text-muted-foreground underline underline-offset-2"
      >
        Use a different email
      </button>
    </form>
  )
}
