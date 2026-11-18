import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'

export type VerificationStatusChipProps = {
  completedSteps: 0 | 1 | 2 | 3
  verifiedByAdmin?: boolean
  className?: string
}

/** The account verification label used on the Verification page and the player's own profile. */
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
