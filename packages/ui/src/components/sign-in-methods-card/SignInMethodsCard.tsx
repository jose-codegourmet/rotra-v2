import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { GoogleMark } from '@rotra/ui/google-mark'
import { Icon } from '@rotra/ui/icon'
import {
  VerificationStatusChip,
  type VerificationStatusChipProps,
} from '@rotra/ui/verification-status-chip'
import type { ReactNode } from 'react'

export type SignInMethodsCardProps = {
  /** The player's ROTRA email */
  email: string
  /** The connected Google account's email; leave out (or null) when Google is not connected */
  googleEmail?: string | null
  /** false: the account has no password ("Not used") */
  hasPassword?: boolean
  /** The date Google becomes required, already formatted: "Backup only until <deadline>" */
  deadline: string
  /** Connect Google (shown when not connected) */
  onConnectGoogle: () => void
  /** Change the connected Google account */
  onChangeGoogle: () => void
  /** The owner's status. Leave out to hide the row while it loads. */
  verification?: VerificationStatusChipProps
  /** Opens the Verification page. */
  onOpenVerification?: () => void
}

/** Prototype's .method row: an icon, a bold title with a muted line, and an action on the right. */
function Method({
  icon,
  title,
  detail,
  children,
}: {
  icon: ReactNode
  title: string
  detail: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 flex-none place-items-center rounded-full bg-elev text-fg2"
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <b>{title}</b>
          <span className="text-[13px] text-fg2 [overflow-wrap:anywhere]">{detail}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

/**
 * The prototype's Privacy and contact › Sign-in methods card: the Google row, the Email and password
 * row, the footer copy and the row pointing to the Verification page.
 */
export function SignInMethodsCard({
  email,
  googleEmail,
  hasPassword = true,
  deadline,
  onConnectGoogle,
  onChangeGoogle,
  verification,
  onOpenVerification,
}: SignInMethodsCardProps) {
  const googleDetail = googleEmail
    ? `Connected · ${googleEmail}${
        googleEmail.toLowerCase() !== email.toLowerCase()
          ? ' (different from your ROTRA email)'
          : ''
      }`
    : 'Not connected'
  const passwordDetail =
    hasPassword === false
      ? 'Not used'
      : googleEmail
        ? `Backup only until ${deadline}`
        : `Password set · ${email}`
  return (
    <Card asChild className="flex flex-col gap-3">
      <section aria-labelledby="sign-in-methods-title">
        <h2 id="sign-in-methods-title">Sign-in methods</h2>
        <Method icon={<GoogleMark />} title="Google" detail={googleDetail}>
          {googleEmail ? (
            <span className="flex flex-wrap items-center gap-2">
              <Chip>Required</Chip>
              <Button size="sm" onClick={onChangeGoogle}>
                Change
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="primary" onClick={onConnectGoogle}>
              Connect Google
            </Button>
          )}
        </Method>
        <Method icon={<Icon name="lock" />} title="Email and password" detail={passwordDetail} />
        <p className="m-0 text-[13px] text-fg2">
          Google sign-in is required for every ROTRA player. Any Google account you own works, even
          with a different email. Your ROTRA email stays {email}.
        </p>
        {verification && onOpenVerification ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-[13px]">Account verification is in its own page.</span>
            <Button size="sm" onClick={onOpenVerification}>
              <VerificationStatusChip {...verification} />
            </Button>
          </div>
        ) : null}
      </section>
    </Card>
  )
}
