import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { LinkPage } from './link-page/LinkPage'

export type AccountLinkStatusVariant =
  | 'reset-sent'
  | 'reset-invalid'
  | 'claim-claimed'
  | 'claim-expired'
  | 'claim-wrong'
  | 'claim-processing'
  | 'claim-done'
export type AccountLinkStatusProps = {
  variant: AccountLinkStatusVariant
  /** reset-sent: the email the player just typed; nothing else ever shows contact data */
  email?: string
  /** The club that issued the registration link */
  clubName?: string
  /** claim-done */
  firstName?: string
  rtrId?: string
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
/** Every non-form outcome of a reset link or a registration link. */
export function AccountLinkStatus({
  variant,
  email,
  clubName = 'your club',
  firstName,
  rtrId,
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
        <AuthCard showBrand={false} title="Check your email">
          <Notice tone="success">
            If an account uses <b>{email}</b>, we've sent it a link to set a new password.
          </Notice>
          <p className="text-[13px] text-fg2">
            It can take a few minutes. Check spam too. Your club can't reset your password for you.
          </p>
          <p className="text-xs text-fg2">Prototype only: no email is sent.</p>
          <Button variant="ghost" block onClick={onBackToSignIn}>
            Back to sign in
          </Button>
        </AuthCard>
      )
    case 'reset-invalid':
      return (
        <AuthCard showBrand={false} title="This link can't be used">
          <Notice tone="error">This reset link has expired or was already used.</Notice>
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
            <Button onClick={onResetByEmail}>Reset password by email</Button>
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
          <Notice tone="success">
            Your profile is registered. Sign in from now on with your phone number or email and your
            password.
          </Notice>
          <Card asChild>
            <section className="flex flex-col gap-1.5">
              <p className="m-0">
                Your player ID stays <span className="font-mono">{rtrId}</span>. Your games and rank
                carry over.
              </p>
              <div className={actions}>
                <Button variant="primary" onClick={onOpenProfile}>
                  Go to my profile
                </Button>
              </div>
            </section>
          </Card>
        </LinkPage>
      )
  }
}
