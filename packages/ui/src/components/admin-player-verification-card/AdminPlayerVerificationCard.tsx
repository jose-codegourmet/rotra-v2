'use client'

import type {
  AdminAccountVerification,
  VerificationEmail,
} from '@rotra/data/account-verification/types'
import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { ErrorState } from '@rotra/ui/error-state'
import { Skeleton } from '@rotra/ui/skeleton'
import { VerificationStatusChip } from '@rotra/ui/verification-status-chip'
import { VerificationStep } from '@rotra/ui/verification-step'
import { useId } from 'react'

export type AdminPlayerVerificationCardProps = {
  /** `phone` is the full E.164 number: Admin never sees it masked. */
  verification?: Omit<AdminAccountVerification, 'revision'>
  onOpenOverride: () => void
  onRetry?: () => void
  retrying?: boolean
}

function matchingEmailStatus(email: VerificationEmail) {
  if (email.kind === 'google_missing') return 'Google must be connected first.'
  if (email.kind === 'match') return `Both are ${email.rotraEmail}`
  return `ROTRA email: ${email.rotraEmail || 'Not given'}. Google email: ${email.googleEmail}.`
}

/** The Verification card below Account on the Admin player's Overview tab. */
export function AdminPlayerVerificationCard({
  verification,
  onOpenOverride,
  onRetry,
  retrying,
}: AdminPlayerVerificationCardProps) {
  const headingId = useId()

  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={headingId}>Verification</h2>
          {verification ? (
            <VerificationStatusChip
              completedSteps={verification.completedSteps}
              verifiedByAdmin={verification.verifiedByAdmin}
            />
          ) : null}
        </div>
        {verification ? (
          <>
            <div>
              <VerificationStep
                number={1}
                title="Google account"
                done={Boolean(verification.googleEmail)}
                status={
                  verification.googleEmail
                    ? `Connected · ${verification.googleEmail}`
                    : 'Not connected'
                }
              />
              <VerificationStep
                number={2}
                title="Mobile number"
                done={Boolean(verification.phone)}
                status={
                  verification.phone
                    ? `On file · ${formatPhoneForDisplay(verification.phone)}`
                    : 'Not on file'
                }
              />
              <VerificationStep
                number={3}
                title="ROTRA email matches Google"
                done={verification.email.kind === 'match'}
                status={matchingEmailStatus(verification.email)}
                chip={
                  verification.email.kind === 'mismatch' &&
                  verification.email.pendingEmailRequest ? (
                    <Chip tone="warn">Change sent for Admin review</Chip>
                  ) : null
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={verification.verifiedByAdmin ? 'secondary' : 'primary'}
                onClick={(event) => {
                  // Keep a stable focus target even on browsers that don't focus clicked buttons.
                  event.currentTarget.focus()
                  onOpenOverride()
                }}
              >
                {verification.verifiedByAdmin ? 'Clear override' : 'Set Verified by Admin'}
              </Button>
            </div>
          </>
        ) : onRetry ? (
          <ErrorState
            title="Couldn't load verification."
            onRetry={onRetry}
            retrying={retrying}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        ) : (
          <div aria-busy className="flex flex-col gap-2.5">
            <Skeleton label="Loading verification" className="w-3/4" />
            <Skeleton className="w-1/2" />
            <Skeleton className="w-2/3" />
          </div>
        )}
      </section>
    </Card>
  )
}
