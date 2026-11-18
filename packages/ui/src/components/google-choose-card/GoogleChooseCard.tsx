import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { GoogleButton } from '@rotra/ui/google-button'
import { Notice } from '@rotra/ui/notice'
import type { ReactNode } from 'react'

export type GoogleChooseCardProps = {
  /** Card heading, e.g. "New to ROTRA?". Leave out when the page already has its own heading (P-CLAIM). */
  title?: string
  /** A problem with the Google account just picked, shown above the buttons */
  error?: string
  /** Google's window is open: "Waiting for Google…" */
  pending?: boolean
  onGoogle: () => void
  /** Opens the No Google account sheet */
  onNoGoogle: () => void
  /** Muted line under the buttons */
  hint: ReactNode
  /** The "Already on ROTRA?" divider and its sign-in button; leave out on P-CLAIM */
  signIn?: { label: string; onClick: () => void }
}

/**
 * The prototype's .choose-card: Continue with Google, I don't have a Google account, a muted line and,
 * on P-INVITE, the "Already on ROTRA?" divider with Sign in. Presentational: the app starts Google.
 */
export function GoogleChooseCard({
  title,
  error,
  pending = false,
  onGoogle,
  onNoGoogle,
  hint,
  signIn,
}: GoogleChooseCardProps) {
  return (
    <Card asChild className="flex flex-col gap-4">
      <section aria-busy={pending || undefined}>
        {title ? <h2>{title}</h2> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <GoogleButton pending={pending} onClick={onGoogle} />
        <Button variant="ghost" block disabled={pending} onClick={onNoGoogle}>
          I don't have a Google account
        </Button>
        <p className="m-0 text-[13px] text-fg2">{hint}</p>
        {signIn ? (
          <>
            <p className="flex items-center m-0 gap-3 text-xs font-semibold tracking-[0.5px] text-fg3 uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              Already on ROTRA?
            </p>
            <Button variant="ghost" block disabled={pending} onClick={signIn.onClick}>
              {signIn.label}
            </Button>
          </>
        ) : null}
      </section>
    </Card>
  )
}
