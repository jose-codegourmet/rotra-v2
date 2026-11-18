'use client'
import { useMyAccountVerification } from '@rotra/data/account-verification/useMyAccountVerification'
import type { GoogleIdentity } from '@rotra/data/google-sign-in/types'
import { useConnectGoogle } from '@rotra/data/google-sign-in/useConnectGoogle'
import { useGoogleDeadline } from '@rotra/data/google-sign-in/useGoogleDeadline'
import { useGoogleTriedEmail } from '@rotra/data/google-sign-in/useGoogleTriedEmail'
import { useRemindMeLater } from '@rotra/data/google-sign-in/useRemindMeLater'
import { AnnouncementBand } from '@rotra/ui/announcement-band'
import { Button } from '@rotra/ui/button'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useGooglePicker } from './useGooglePicker'
import { useNoGoogleSheet } from './useNoGoogleSheet'

/** The signed-in player's verification announcement, mounted by the shell while Google sign-in is on. */
export function GoogleAnnouncementBand({ playerId, name }: { playerId: string; name: string }) {
  const verification = useMyAccountVerification(playerId).data
  const deadline = useGoogleDeadline().data
  const tried = useGoogleTriedEmail()
  const later = useRemindMeLater()
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
  const picker = useGooglePicker({ key: 'band', intent: 'connect' }, connectWith)
  const noGoogle = useNoGoogleSheet()
  if (!verification || !deadline || verification.verified || (!deadline.passed && later.reminded))
    return null

  const openVerification = () => router.push('/profile/verification')
  const chooseGoogle = () => picker.start(connectWith)
  const triedEmail = tried.email
  return (
    <>
      <AnnouncementBand
        afterDeadline={deadline.passed}
        verification={{ deadline: deadline.label, completedSteps: verification.completedSteps }}
        onRemindLater={() => {
          later.remind()
          toast(`We'll remind you next time. Connect by ${deadline.label}.`)
        }}
        actions={
          verification.googleEmail ? (
            <>
              <Button size="xs" variant="primary" onClick={openVerification}>
                Finish verification
              </Button>
              <Button size="xs" variant="ghost" onClick={openVerification}>
                See what's left
              </Button>
            </>
          ) : (
            <>
              {triedEmail ? (
                <>
                  <Button
                    size="xs"
                    variant="primary"
                    disabled={connect.isPending}
                    onClick={() => picker.startWith({ email: triedEmail, name }, connectWith)}
                  >
                    Connect {triedEmail}
                  </Button>
                  <Button size="xs" disabled={connect.isPending} onClick={chooseGoogle}>
                    Use another Google account
                  </Button>
                </>
              ) : (
                <Button
                  size="xs"
                  variant="primary"
                  disabled={connect.isPending}
                  onClick={chooseGoogle}
                >
                  Connect Google
                </Button>
              )}
              <Button size="xs" variant="ghost" onClick={noGoogle.open}>
                I don't have a Google account
              </Button>
            </>
          )
        }
      />
      {picker.sheet}
      {noGoogle.sheet}
    </>
  )
}
