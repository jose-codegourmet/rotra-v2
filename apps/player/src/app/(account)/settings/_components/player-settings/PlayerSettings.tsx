'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { Button } from '@rotra/ui/button'
import { PageHeader } from '@rotra/ui/page-header'
import { SettingsList } from '@rotra/ui/settings-list'
import { useTheme } from '@rotra/ui/theme-provider'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount, setAccount } from '@/store/slices/authSlice'
import Loading from '../../loading'

export function PlayerSettings() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const account = useAppSelector(selectAccount)
  const session = useSession('player')
  const signOut = useSignOut('player')
  const { theme, setTheme } = useTheme()
  const hasAccount = Boolean(session.data || account)
  // The proxy guards direct requests. This also covers a missing client session in mock mode.
  const needsSignIn = !hasAccount && !session.isPending && !signOut.isPending && !signOut.isSuccess
  useEffect(() => {
    if (needsSignIn) router.replace(`/login?returnTo=${encodeURIComponent('/settings')}`)
  }, [needsSignIn, router])

  const leaveSignedOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        dispatch(setAccount(null))
        router.push('/')
        toast('Signed out')
      },
      onError: (error) => toast.error(error.message),
    })

  if (!hasAccount) return <Loading />

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px]">
      <PageHeader
        title="Settings"
        description="Your account, privacy and how ROTRA looks on this device."
      />
      <SettingsList
        section="account"
        onEditProfile={() => router.push('/profile/edit')}
        onOpenPrivacy={() => router.push('/profile/privacy-and-contact')}
        onOpenVerification={() => router.push('/profile/verification')}
      />
      <SettingsList
        section="device"
        darkMode={theme === 'dark'}
        onDarkModeChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
      <Button
        variant="ghost"
        className="self-start"
        loading={signOut.isPending}
        onClick={leaveSignedOut}
      >
        Sign out
      </Button>
    </main>
  )
}
