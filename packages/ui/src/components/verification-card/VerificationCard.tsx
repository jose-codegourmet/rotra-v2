import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { ProgressBar } from '@rotra/ui/progress-bar'
import {
  VerificationStatusChip,
  type VerificationStatusChipProps,
} from '@rotra/ui/verification-status-chip'
import type { ReactNode } from 'react'

export type VerificationCardProps = Pick<
  VerificationStatusChipProps,
  'completedSteps' | 'verifiedByAdmin'
> & {
  /** The formatted Google sign-in deadline. */
  deadline: string
  /** The three VerificationStep rows, in their screen order. */
  children?: ReactNode
}

/** The Your status card on P-VERIFICATION. */
export function VerificationCard({
  completedSteps,
  verifiedByAdmin,
  deadline,
  children,
}: VerificationCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Your status</h2>
          <VerificationStatusChip
            completedSteps={completedSteps}
            verifiedByAdmin={verifiedByAdmin}
          />
        </div>
        {verifiedByAdmin ? (
          <Notice tone="success">
            ROTRA Admin verified your account. You don't need to do anything else.
          </Notice>
        ) : (
          <>
            {completedSteps === 3 ? (
              <p className="text-[13px] text-fg2">
                Your account is verified: Google is connected, your phone is on file and your email
                matches Google.
              </p>
            ) : (
              <>
                <p className="text-[13px] text-fg2">
                  Finish these by <b>{deadline}</b>. {completedSteps} of 3 done.
                </p>
                <ProgressBar
                  aria-label="Account verification steps completed"
                  value={completedSteps}
                  max={3}
                  size="sm"
                />
              </>
            )}
            <div className="flex flex-col">{children}</div>
          </>
        )}
        <p className="text-[13px] text-fg2">
          Can't finish a step? Contact ROTRA. Admin can verify your account by hand.
        </p>
      </section>
    </Card>
  )
}
