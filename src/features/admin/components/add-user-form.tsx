'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const addUserSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  role: z.enum(['viewer', 'admin']),
})

type AddUserFormValues = z.infer<typeof addUserSchema>

export function AddUserForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { email: '', role: 'viewer' },
  })

  function handleClose() {
    setOpen(false)
    reset()
    setServerError('')
  }

  async function onSubmit(values: AddUserFormValues) {
    setServerError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error || 'Failed to create user')
        return
      }
      handleClose()
      router.refresh()
    } catch {
      setServerError('An unexpected error occurred.')
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-4 text-sm"
      >
        + Add User
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Add New User</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Email</Label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  className="h-9 text-sm"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
                <p className="text-xs text-slate-400">
                  Their full name fills in automatically when they first sign in.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Role</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Management</SelectItem>
                        <SelectItem value="admin">AEO</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {serverError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {serverError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white h-8 px-4 text-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="h-8 px-3 text-sm text-slate-500"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
