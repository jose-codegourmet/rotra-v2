'use client'
import { useRequestPasswordReset } from '@rotra/data/player-account/useRequestPasswordReset'
import { AccountLinkStatus } from '@rotra/ui/account-link-status'
import { ForgotPasswordForm } from '@rotra/ui/forgot-password-form'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'
export function ForgotPassword() {
  const mutation = useRequestPasswordReset(),
    router = useRouter(),
    { offline } = useAppSelector(selectDev)
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [signsInWithGoogle, setSignsInWithGoogle] = useState(false)
  if (sentEmail !== null)
    return (
      <AccountLinkStatus
        variant={signsInWithGoogle ? 'reset-google' : 'reset-sent'}
        email={sentEmail}
        onBackToSignIn={() => router.push('/login')}
      />
    )
  return (
    <ForgotPasswordForm
      onBack={() => router.push('/login')}
      isPending={mutation.isPending}
      offline={offline}
      serverError={mutation.error?.message}
      onSubmit={({ email }) =>
        mutation.mutate(email, {
          onSuccess: (result) => {
            setSignsInWithGoogle(result.signsInWithGoogle === true)
            setSentEmail(email)
            toast('Reset link requested')
          },
          onError: (error) => toast.error(error.message),
        })
      }
    />
  )
}
