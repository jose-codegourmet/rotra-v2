import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { GoogleIdentityRow } from '@rotra/ui/google-identity-row'
import { PlayerAccountRow } from '@rotra/ui/player-account-row'

export type GoogleLinkCardProps = {
  /** The password player whose ROTRA email the Google account shares */
  player: { name: string; rtrId: string; photoUrl?: string }
  /** The Google account that was picked */
  google: { name: string; email: string }
  /** Connect Google and sign in is running */
  isPending?: boolean
  onConnect: () => void
  /** Back to P-LOGIN with the email filled */
  onUsePassword: () => void
}

/**
 * P-GOOGLE-LINK: a Google account with the same email as a password account was picked. Asks once
 * before connecting; never links silently. Presentational: the container confirms through
 * useConfirmGoogleLink and owns the navigation.
 */
export function GoogleLinkCard({
  player,
  google,
  isPending = false,
  onConnect,
  onUsePassword,
}: GoogleLinkCardProps) {
  return (
    <AuthCard
      title="Connect Google to your account?"
      description="You already have a ROTRA account with this email. You signed up with a password."
    >
      <PlayerAccountRow name={player.name} detail={player.rtrId} mono photoUrl={player.photoUrl} />
      <GoogleIdentityRow name={google.name} email={google.email} chip="same-email" />
      <p className="m-0 text-[13px] text-fg2">
        After this you can sign in with Google or with your password. Nothing else on your account
        changes. You can change your Google account in Privacy and contact.
      </p>
      <Button variant="primary" block loading={isPending} onClick={onConnect}>
        Connect Google and sign in
      </Button>
      <Button block disabled={isPending} onClick={onUsePassword}>
        Use my password instead
      </Button>
    </AuthCard>
  )
}
