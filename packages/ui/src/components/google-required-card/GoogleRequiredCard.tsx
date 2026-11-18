import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { GoogleButton } from '@rotra/ui/google-button'
import { GoogleMark } from '@rotra/ui/google-mark'
import { PlayerAccountRow } from '@rotra/ui/player-account-row'

export type GoogleRequiredCardProps = {
  player: { name: string; email: string; photoUrl?: string }
  /** "December 31, 2026" */
  deadlineLabel: string
  /** The Google email tried on P-LOGIN that wasn't connected; offers Connect <email> */
  triedEmail?: string | null
  /** Google's window is open (or the connect call is running) */
  pending?: boolean
  /** Connect <tried email> */
  onConnectTried: () => void
  /** Connect Google, or Use another Google account when a tried email is offered */
  onChooseGoogle: () => void
  onNoGoogle: () => void
  onSignOut: () => void
  signOutPending?: boolean
}

/**
 * P-GOOGLE-REQUIRED: after the deadline a password-only player sees only this page (and the
 * leaderboard). Presentational: the container owns the connect calls, the sheets and sign-out.
 */
export function GoogleRequiredCard({
  player,
  deadlineLabel,
  triedEmail,
  pending = false,
  onConnectTried,
  onChooseGoogle,
  onNoGoogle,
  onSignOut,
  signOutPending = false,
}: GoogleRequiredCardProps) {
  return (
    <AuthCard
      title="Connect Google to continue"
      description={`Since ${deadlineLabel}, every ROTRA player signs in with Google. Connect yours once and you're done. Your profile, games and rank stay the same.`}
    >
      <PlayerAccountRow name={player.name} detail={player.email} photoUrl={player.photoUrl} />
      {triedEmail ? (
        <Button
          variant="primary"
          block
          disabled={pending}
          className="gap-2.5"
          onClick={onConnectTried}
        >
          <GoogleMark />
          Connect {triedEmail}
        </Button>
      ) : null}
      <GoogleButton
        label={triedEmail ? 'Use another Google account' : 'Connect Google'}
        pending={pending}
        onClick={onChooseGoogle}
      />
      <Button variant="ghost" block disabled={pending} onClick={onNoGoogle}>
        I don't have a Google account
      </Button>
      <Button variant="ghost" block disabled={signOutPending} onClick={onSignOut}>
        Sign out
      </Button>
    </AuthCard>
  )
}
