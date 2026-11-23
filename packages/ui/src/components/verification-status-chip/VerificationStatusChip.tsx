import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'

export type VerificationStatusChipProps = {
  completedSteps: 0 | 1 | 2 | 3
  verifiedByAdmin?: boolean
  className?: string
}

/** The account verification label used on the Verification page, the own profile and Admin. */
export function VerificationStatusChip({
  completedSteps,
  verifiedByAdmin,
  className,
}: VerificationStatusChipProps) {
  if (verifiedByAdmin || completedSteps === 3) {
    return (
      <Chip tone="accent" className={className}>
        <Icon name="check" />
        {verifiedByAdmin ? 'Verified by Admin' : 'Verified'}
      </Chip>
    )
  }

  return (
    <Chip tone="warn" className={className}>
      Not verified · {completedSteps} of 3
    </Chip>
  )
}

export type PublicVerificationChipProps = { verified: boolean; className?: string }

/**
 * What others see on a registered player's public profile (D-2026-11-23-07): the result only.
 * No step count, and Verified by Admin reads Verified.
 */
export function PublicVerificationChip({ verified, className }: PublicVerificationChipProps) {
  return verified ? (
    <Chip tone="accent" className={className}>
      <Icon name="check" />
      Verified
    </Chip>
  ) : (
    <Chip className={className}>Not verified</Chip>
  )
}
