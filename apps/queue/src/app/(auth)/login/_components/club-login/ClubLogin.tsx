'use client'

import { useSession } from '@rotra/data/auth/use-session'
import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import { ClubLoginForm } from '@rotra/ui/forms/club-login-form'
import { ThemeToggle } from '@rotra/ui/theme-toggle'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DevTools } from '@/providers/DevTools'
import { DEV_TOOLS_ENABLED } from '@/providers/devToolsEnabled'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

/** Q-LOGIN: the club account sign-in; signed-in clubs go straight to the dashboard. */
export function ClubLogin() {
  const router = useRouter()
  const session = useSession('club')
  const signIn = useSignIn('club')
  const offline = useAppSelector(selectDev).offline

  useEffect(() => {
    if (session.data?.account) router.replace('/')
  }, [session.data, router])

  return (
    <>
      <TopBar product="Queue">
        <ThemeToggle />
        {DEV_TOOLS_ENABLED ? <DevTools /> : null}
      </TopBar>
      <ClubLoginForm
        offline={offline}
        isPending={signIn.isPending}
        serverError={signIn.error?.message}
        onSubmit={(values) =>
          signIn.mutate(
            { identifier: values.username, password: values.password },
            { onSuccess: () => router.push('/') },
          )
        }
      />
    </>
  )
}
