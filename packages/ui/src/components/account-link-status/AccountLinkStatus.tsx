import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { LinkPage } from './link-page/LinkPage'

export type AccountLinkStatusVariant =
  | 'reset-sent'
  | 'reset-google'
  | 'reset-invalid'
  | 'claim-claimed'
  | 'claim-expired'
  | 'claim-wrong'
  | 'claim-processing'
  | 'claim-done'
export type AccountLinkStatusProps = {
  variant: AccountLinkStatusVariant
  /** reset-sent, reset-google: the email the player just typed; nothing else ever shows contact data */
  email?: string
  /** reset-invalid: a failed redemption also needs a new reviewed link. */
  resetError?: string
  /** The club that issued the registration link */
  clubName?: string
  /** claim-done */
  firstName?: string
  rtrId?: string
  /** Newly registered through a guest invitation; no existing games or guest record were linked. */
  standalone?: boolean
  sessionTitle?: string | null
  /** claim-done after Google (player_google_sign_in flag): "You sign in with Google (<email>)." */
  googleEmail?: string
  /**
   * claim-done after a registration that claimed unclaimed records (D-2026-11-16-04): the clubs whose
   * records joined the account. Shows "Your records from A and B are now on your account, with their
   * games." and "Your player ID stays …".
   */
  joinedClubs?: string[]
  onBackToSession?: () => void
  /** claim-processing: Check again is running */
  isPending?: boolean
  onBackToSignIn?: () => void
  onRequestAnother?: () => void
  onSignIn?: () => void
  onResetByEmail?: () => void
  onThisIsMe?: () => void
  onCheckAgain?: () => void
  onOpenProfile?: () => void
}
/** "A", "A and B", "A, B and C" */
const listClubs = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

/** Every non-form outcome of a reset link or a registration link. */
export function AccountLinkStatus({
  variant,
  email,
  resetError,
  clubName = 'your club',
  firstName,
  rtrId,
  standalone = false,
  sessionTitle,
  googleEmail,
  joinedClubs,
  onBackToSession,
  isPending = false,
  onBackToSignIn,
  onRequestAnother,
  onSignIn,
  onResetByEmail,
  onThisIsMe,
  onCheckAgain,
  onOpenProfile,
}: AccountLinkStatusProps) {
  const fromClub = `Registration link from ${clubName}`
  const actions = 'flex flex-wrap gap-2'
  switch (variant) {
    case 'reset-sent':
      return (
        <AuthCard showBrand={false} title="Request received">
          <Notice tone="success">
            If an account uses <b>{email}</b>, ROTRA Admin can review your request after verifying
            ownership.
          </Notice>
          <p className="text-[13px] text-fg2">
            Contact ROTRA support through your usual channel to verify ownership. An Admin will
            provide your reset link.
          </p>
          <p className="text-xs text-fg2">No automatic email is sent.</p>
          <Button variant="ghost" block onClick={onBackToSignIn}>
            Back to sign in
          </Button>
        </AuthCard>
      )
    case 'reset-google':
      return (
        <AuthCard showBrand={false} title="Request received">
          <Notice tone="info">
            <b>{email}</b> signs in with Google and has no password. Go back and choose{' '}
            <b>Continue with Google</b>.
          </Notice>
          <p className="text-[13px] text-fg2">
            Contact ROTRA support through your usual channel to verify ownership. An Admin will
            provide your reset link.
          </p>
          <p className="text-xs text-fg2">No automatic email is sent.</p>
          <Button variant="ghost" block onClick={onBackToSignIn}>
            Back to sign in
          </Button>
        </AuthCard>
      )
    case 'reset-invalid':
      return (
        <AuthCard showBrand={false} title="This link can't be used">
          <Notice tone="error">
            {resetError ?? 'This reset link has expired or was already used.'}
          </Notice>
          <Button variant="primary" block onClick={onRequestAnother}>
            Request another reset
          </Button>
        </AuthCard>
      )
    case 'claim-claimed':
      return (
        <LinkPage label={fromClub} title="This profile is already registered">
          <Notice tone="info">
            This link was already used to finish registering. It can't create another account.
          </Notice>
          <div className={actions}>
            <Button variant="primary" onClick={onSignIn}>
              Sign in
            </Button>
            <Button onClick={onResetByEmail}>Request password reset</Button>
          </div>
        </LinkPage>
      )
    case 'claim-expired':
      return (
        <LinkPage label={fromClub} title="This link can't be used">
          <Notice tone="error">The registration link has expired or was replaced.</Notice>
          <p className="m-0 text-fg2">
            Ask the club that added you to send a new link. If you already registered, sign in
            instead.
          </p>
          <div className={actions}>
            <Button onClick={onSignIn}>Sign in</Button>
          </div>
        </LinkPage>
      )
    case 'claim-wrong':
      return (
        <LinkPage label={fromClub} title="We've stopped here">
          <Notice tone="info">Nothing was changed on this profile.</Notice>
          <p className="m-0 text-fg2">
            Tell {clubName} or ROTRA that the link opened someone else's profile, so they can send
            you the right one.
          </p>
          <div className={actions}>
            <Button onClick={onThisIsMe}>This is me after all</Button>
          </div>
        </LinkPage>
      )
    case 'claim-processing':
      return (
        <LinkPage label={fromClub} title="Setting up your account">
          <Notice tone="warn">
            Your registration was received and is still being set up. You don't need to send it
            again.
          </Notice>
          <div className={actions}>
            <Button variant="primary" loading={isPending} onClick={onCheckAgain}>
              Check again
            </Button>
          </div>
        </LinkPage>
      )
    case 'claim-done':
      return (
        <LinkPage label="Registration complete" title={`Welcome, ${firstName ?? ''}`}>
          {standalone && joinedClubs?.length ? (
            <Notice tone="success">
              Your records from {listClubs(joinedClubs)} are now on your account, with their games.
            </Notice>
          ) : null}
          {standalone && joinedClubs?.length && clubName === 'your club' ? null : (
            <Notice tone="success">
              {standalone
                ? clubName !== 'your club'
                  ? `You're now in ${clubName}'s saved players.`
                  : 'Your ROTRA account is ready.'
                : googleEmail
                  ? `Your profile is registered. Sign in from now on with Google (${googleEmail}).`
                  : 'Your profile is registered. Sign in from now on with your email and your password.'}
            </Notice>
          )}
          {standalone && sessionTitle ? (
            <Notice>Your request to join {sessionTitle} is ready to send.</Notice>
          ) : null}
          <Card asChild>
            <section className="flex flex-col gap-1.5">
              <p className="m-0">
                {standalone && !joinedClubs?.length
                  ? 'Your player ID is '
                  : 'Your player ID stays '}
                <span className="font-mono">{rtrId}</span>.
                {standalone ? '' : ' Your games and rank carry over.'}
              </p>
              {standalone && googleEmail ? (
                <p className="m-0 text-[13px] text-fg2">You sign in with Google ({googleEmail}).</p>
              ) : null}
              <div className={actions}>
                {onBackToSession ? (
                  <Button variant="primary" onClick={onBackToSession}>
                    Back to the session
                  </Button>
                ) : null}
                <Button variant={onBackToSession ? undefined : 'primary'} onClick={onOpenProfile}>
                  Go to my profile
                </Button>
              </div>
            </section>
          </Card>
        </LinkPage>
      )
  }
}
