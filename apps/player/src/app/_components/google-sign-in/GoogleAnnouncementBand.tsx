'use client'
import type { GoogleIdentity } from '@rotra/data/google-sign-in/types'
import { useConnectGoogle } from '@rotra/data/google-sign-in/useConnectGoogle'
import { useGoogleRequirement } from '@rotra/data/google-sign-in/useGoogleRequirement'
import { useGoogleTriedEmail } from '@rotra/data/google-sign-in/useGoogleTriedEmail'
import { useRemindMeLater } from '@rotra/data/google-sign-in/useRemindMeLater'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { AnnouncementBand } from '@rotra/ui/announcement-band'
import { Button } from '@rotra/ui/button'
import { toast } from '@rotra/ui/toaster'
import { useGooglePicker } from './useGooglePicker'
import { useNoGoogleSheet } from './useNoGoogleSheet'

/**
 * The ROTRA announcement band (D-2026-11-16-02), a second band under the top bar next to the email
 * confirm banner. Mounted by the shell only while `player_google_sign_in` is on. Shown while the
 * signed-in player has no Google account. The "n of 3 done" count and **Finish verification** belong
 * to Epic P13 (Verification), which isn't built: the band is driven by the Google requirement only.
 */
export function GoogleAnnouncementBand({ playerId, name }: { playerId: string; name: string }) {
  const account = useMyAccount(playerId).data
  const requirement = useGoogleRequirement(account)
  const tried = useGoogleTriedEmail()
  const later = useRemindMeLater()
  const connect = useConnectGoogle()
  const picker = useGooglePicker()
  const noGoogle = useNoGoogleSheet()
  if (
    !account ||
    !requirement.deadline ||
    requirement.state === 'connected' ||
    requirement.reminded
  )
    return null
  const deadline = requirement.deadline.label
  const connectWith = (identity: GoogleIdentity) =>
    connect.mutate(identity, {
      onSuccess: (result) =>
        result.outcome === 'connected'
          ? toast('Google connected')
          : toast(`${result.email} is already used by another ROTRA account.`),
      onError: (error) => toast.error(error.message),
    })
  return (
    <>
      <AnnouncementBand
        afterDeadline={requirement.deadline.passed}
        onRemindLater={
          requirement.canRemindLater
            ? () => {
                later.remind()
                toast(`We'll remind you next time. Connect by ${deadline}.`)
              }
            : undefined
        }
        actions={
          <>
            {tried.email ? (
              <>
                <Button
                  size="xs"
                  variant="primary"
                  disabled={connect.isPending}
                  onClick={() => tried.email && connectWith({ email: tried.email, name })}
                >
                  Connect {tried.email}
                </Button>
                <Button
                  size="xs"
                  disabled={connect.isPending}
                  onClick={() => picker.start(connectWith)}
                >
                  Use another Google account
                </Button>
              </>
            ) : (
              <Button
                size="xs"
                variant="primary"
                disabled={connect.isPending}
                onClick={() => picker.start(connectWith)}
              >
                Connect Google
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={noGoogle.open}>
              I don't have a Google account
            </Button>
          </>
        }
      >
        <b>Verify your ROTRA account by {deadline}.</b> Connect Google, have your phone on file, and
        use your Google email as your ROTRA email. Your profile, games and rank stay the same.
      </AnnouncementBand>
      {picker.sheet}
      {noGoogle.sheet}
    </>
  )
}
