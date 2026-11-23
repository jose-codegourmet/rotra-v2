'use client'
import { useMyAccountVerification } from '@rotra/data/account-verification/useMyAccountVerification'
import { useSession } from '@rotra/data/auth/use-session'
import type { GoogleIdentity } from '@rotra/data/google-sign-in/types'
import { useConnectGoogle } from '@rotra/data/google-sign-in/useConnectGoogle'
import { useGoogleDeadline } from '@rotra/data/google-sign-in/useGoogleDeadline'
import { toast } from '@rotra/ui/toaster'
import { VerificationPage, type VerificationPageProps } from '@rotra/ui/verification-page'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useGooglePicker } from '@/app/_components/google-sign-in/useGooglePicker'
import { usePlayerGoogleSignInEnabled } from '@/providers/PlayerFlagsProvider'
import { useContactChangeSheet } from '../../../_components/contact-change-sheet/useContactChangeSheet'
import { useRequireSignedIn } from '../../../_components/require-signed-in/useRequireSignedIn'

export function AccountVerification() {
  const signedOut = useRequireSignedIn()
  const session = useSession('player')
  const playerId = session.data?.account.id ?? null
  const verification = useMyAccountVerification(playerId)
  const deadline = useGoogleDeadline()
  const contactChange = useContactChangeSheet(playerId)
  const googleEnabled = usePlayerGoogleSignInEnabled()
  const connect = useConnectGoogle()
  const router = useRouter()
  const connectWith = (identity: GoogleIdentity) =>
    connect.mutate(identity, {
      onSuccess: (result) =>
        result.outcome === 'connected'
          ? toast('Google connected')
          : toast(`${result.email} is already used by another ROTRA account.`),
      onError: (error) => toast.error(error.message),
    })
  const picker = useGooglePicker(
    { key: 'verification', intent: 'connect' },
    googleEnabled ? connectWith : undefined,
  )

  // D-2026-11-18-01: while Google sign-in is off there is no verification to do (two of its three
  // steps need Google), so the page sends the player to their profile.
  useEffect(() => {
    if (!googleEnabled && playerId) router.replace(`/players/${encodeURIComponent(playerId)}`)
  }, [googleEnabled, playerId, router])

  if (signedOut || !googleEnabled) return null

  let state: VerificationPageProps['state'] = { kind: 'loading' }
  if (verification.data && deadline.data) {
    state = {
      kind: 'ready',
      verification: verification.data,
      deadline: deadline.data.label,
      onConnectGoogle: googleEnabled ? () => picker.start(connectWith) : undefined,
      connectingGoogle: connect.isPending,
      onAddPhone: () => contactChange.openWithDefaults({ field: 'phone' }),
      onChangeEmail: (email) => contactChange.openWithDefaults({ field: 'email', toValue: email }),
    }
  } else if (
    session.isError ||
    verification.isError ||
    verification.data === null ||
    deadline.isError
  ) {
    state = {
      kind: 'error',
      retrying: session.isFetching || verification.isFetching || deadline.isFetching,
      onRetry: () => {
        if (session.isError) void session.refetch()
        if (playerId) void verification.refetch()
        if (deadline.isError) void deadline.refetch()
      },
    }
  }
  return (
    <>
      <VerificationPage
        state={state}
        onBack={
          playerId ? () => router.push(`/players/${encodeURIComponent(playerId)}`) : undefined
        }
      />
      {contactChange.sheet}
      {googleEnabled ? picker.sheet : null}
    </>
  )
}
