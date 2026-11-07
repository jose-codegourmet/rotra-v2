'use client'
import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { isRealDataMode } from '@rotra/data/real/mode'
import { SignInForm } from '@rotra/ui/sign-in-form'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'

/** The only other site a sign-in may return to: a public session page of the Queue app. */
const QUEUE_ORIGINS = ['https://queue.rotra.club', 'http://localhost:9000']

/** An absolute Queue app public session URL (/s/...) on an allowlisted origin, else null. */
function queueSessionUrl(returnTo: string | undefined) {
  if (!returnTo || returnTo.includes('\\')) return null
  try {
    const url = new URL(returnTo)
    return QUEUE_ORIGINS.includes(url.origin) && url.pathname.startsWith('/s/') ? url.href : null
  } catch {
    return null
  }
}

/** Accept only same-app absolute paths; never turn a return parameter into an external redirect. */
function destination(returnTo: string | undefined, fallback: string) {
  if (!returnTo?.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\'))
    return fallback
  try {
    const url = new URL(returnTo, 'https://rotra.local')
    return url.origin === 'https://rotra.local' && url.pathname !== '/login'
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback
  } catch {
    return fallback
  }
}
export function SignIn({
  returnTo,
  passwordSaved = false,
}: {
  returnTo?: string
  passwordSaved?: boolean
}) {
  const mutation = useSignIn('player'),
    router = useRouter(),
    dispatch = useAppDispatch()
  const { offline } = useAppSelector(selectDev)
  return (
    <SignInForm
      isPending={mutation.isPending}
      serverError={mutation.error?.message}
      offline={offline}
      prototypeHints={!isRealDataMode()}
      successNote={passwordSaved ? 'Password saved. Sign in with your new password.' : undefined}
      onForgotPassword={() => router.push('/forgot-password')}
      onSubmit={(values) =>
        mutation.mutate(
          { identifier: values.email, password: values.password },
          {
            onSuccess: (session) => {
              dispatch(setAccount(session.account))
              const queueUrl = queueSessionUrl(returnTo)
              if (queueUrl) window.location.assign(queueUrl)
              else router.replace(destination(returnTo, `/players/${session.account.id}`))
              toast('Signed in')
            },
            onError: (error) => toast.error(error.message),
          },
        )
      }
    />
  )
}
