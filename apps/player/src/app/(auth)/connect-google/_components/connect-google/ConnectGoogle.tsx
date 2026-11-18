'use client'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import type { GoogleIdentity } from '@rotra/data/google-sign-in/types'
import { useConfirmGoogleLink } from '@rotra/data/google-sign-in/useConfirmGoogleLink'
import { useConnectGoogle } from '@rotra/data/google-sign-in/useConnectGoogle'
import { useGoogleRequirement } from '@rotra/data/google-sign-in/useGoogleRequirement'
import { useGoogleTriedEmail } from '@rotra/data/google-sign-in/useGoogleTriedEmail'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { GoogleLinkCard } from '@rotra/ui/google-link-card'
import { GoogleRequiredCard } from '@rotra/ui/google-required-card'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useGooglePicker } from '@/app/_components/google-sign-in/useGooglePicker'
import { useNoGoogleSheet } from '@/app/_components/google-sign-in/useNoGoogleSheet'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { returnDestination } from '@/app/(auth)/login/_components/sign-in/returnDestination'
import { usePlayerGoogleSignInEnabled } from '@/providers/PlayerFlagsProvider'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount, setAccount } from '@/store/slices/authSlice'
import { selectPendingLink, setLoginEmail, setPendingLink } from '@/store/slices/googleSlice'

/** `/connect-google`: P-GOOGLE-LINK (signed out, a held link) or P-GOOGLE-REQUIRED (signed in, after the deadline). */
export function ConnectGoogle() {
  const enabled = usePlayerGoogleSignInEnabled(),
    router = useRouter(),
    account = useAppSelector(selectAccount),
    pendingLink = useAppSelector(selectPendingLink)
  const goesToLogin = !enabled || (!account && !pendingLink)
  useEffect(() => {
    if (goesToLogin) router.replace('/login')
  }, [goesToLogin, router])
  if (goesToLogin) return null
  if (account) return <GoogleRequired playerId={account.id} name={account.name} />
  return pendingLink ? <GoogleLink link={pendingLink} /> : null
}

function GoogleLink({ link }: { link: NonNullable<ReturnType<typeof selectPendingLink>> }) {
  const router = useRouter(),
    dispatch = useAppDispatch()
  const profile = usePlayerProfile(link.playerId).data
  const confirm = useConfirmGoogleLink()
  return (
    <GoogleLinkCard
      player={{
        name: profile?.fullName ?? link.playerName,
        rtrId: profile?.rtrId ?? '',
        photoUrl: profile
          ? (pictureSrc(profile.picture, profile.playerId, profile.fullName) ?? undefined)
          : undefined,
      }}
      google={link.google}
      isPending={confirm.isPending}
      onConnect={() =>
        confirm.mutate(
          { playerId: link.playerId, googleEmail: link.google.email },
          {
            onSuccess: ({ session }) => {
              dispatch(setAccount(session.account))
              dispatch(setPendingLink(null))
              router.replace(returnDestination(link.returnTo, `/players/${session.account.id}`))
              toast("Google connected. You're signed in.")
            },
            onError: (error) => toast.error(error.message),
          },
        )
      }
      onUsePassword={() => {
        dispatch(setLoginEmail(link.google.email))
        dispatch(setPendingLink(null))
        router.push(
          link.returnTo ? `/login?returnTo=${encodeURIComponent(link.returnTo)}` : '/login',
        )
      }}
    />
  )
}

function GoogleRequired({ playerId, name }: { playerId: string; name: string }) {
  const router = useRouter(),
    dispatch = useAppDispatch()
  const account = useMyAccount(playerId).data
  const profile = usePlayerProfile(playerId).data
  const requirement = useGoogleRequirement(account)
  const tried = useGoogleTriedEmail()
  const connect = useConnectGoogle()
  const connectWith = (identity: GoogleIdentity) =>
    connect.mutate(identity, {
      onSuccess: (result) => {
        if (result.outcome === 'connected') {
          toast('Google connected')
          router.replace(`/players/${playerId}`)
        } else toast(`${result.email} is already used by another ROTRA account.`)
      },
      onError: (error) => toast.error(error.message),
    })
  const picker = useGooglePicker({ key: 'required', intent: 'connect' }, connectWith)
  const noGoogle = useNoGoogleSheet()
  const signOut = useSignOut('player')
  // Already connected, or before the deadline: nothing to require here.
  useEffect(() => {
    if (account && requirement.deadline && requirement.state !== 'required')
      router.replace(`/players/${playerId}`)
  }, [account, requirement.deadline, requirement.state, router, playerId])
  if (!account || requirement.state !== 'required' || !requirement.deadline) return null
  return (
    <>
      <GoogleRequiredCard
        player={{
          name,
          email: account.email,
          photoUrl: profile
            ? (pictureSrc(profile.picture, profile.playerId, profile.fullName) ?? undefined)
            : undefined,
        }}
        deadlineLabel={requirement.deadline.label}
        triedEmail={tried.email}
        pending={connect.isPending}
        onConnectTried={() => {
          if (tried.email) picker.startWith({ email: tried.email, name }, connectWith)
        }}
        onChooseGoogle={() => picker.start(connectWith)}
        onNoGoogle={noGoogle.open}
        signOutPending={signOut.isPending}
        onSignOut={() =>
          signOut.mutate(undefined, {
            onSuccess: () => {
              dispatch(setAccount(null))
              router.push('/')
              toast('Signed out')
            },
            onError: (error) => toast.error(error.message),
          })
        }
      />
      {picker.sheet}
      {noGoogle.sheet}
    </>
  )
}
