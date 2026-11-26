import type { AdminPlayerVerification } from '@rotra/data/admin-player/types'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { VerificationStatusChip } from '@rotra/ui/verification-status-chip'

export type PlayerAccountChipProps = {
  /** The player finished registering (claimed their Player Information account) */
  claimed: boolean
  /**
   * The derived verification status (D-2026-11-23-07). A verified player shows Verified or Verified
   * by Admin in place of Registered; a registered player who isn't shows Registered and
   * Not verified · N of 3. Omit to show the account state only.
   */
  verification?: AdminPlayerVerification | null
  className?: string
}

/**
 * A player's account state in Admin: Registered, Verified or Unclaimed. The Queue IdentityChip with
 * the states Admin lists (Admin never shows guests), so the words and tones stay the same everywhere.
 */
export function PlayerAccountChip({ claimed, verification, className }: PlayerAccountChipProps) {
  if (!claimed || !verification)
    return <IdentityChip identity={claimed ? 'registered' : 'unclaimed'} className={className} />
  const status = (
    <VerificationStatusChip
      completedSteps={verification.completedSteps}
      verifiedByAdmin={verification.verifiedByAdmin}
      className={className}
    />
  )
  if (verification.verified) return status
  return (
    <>
      <IdentityChip identity="registered" className={className} />
      {status}
    </>
  )
}
