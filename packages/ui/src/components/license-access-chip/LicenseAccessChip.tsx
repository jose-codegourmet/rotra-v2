import type { ClubAccessState } from '@rotra/data/license/types'
import { Chip } from '@rotra/ui/chip'
import { licenseAccessLabel } from './LicenseAccessChip.variants'

export type LicenseAccessChipProps = {
  /** Computed upstream (A02.8); the chip only formats it */
  access: ClubAccessState
  className?: string
}

/** A club's license access in the Admin directory: Active, Ends in N days, Expired, Starts …, No license yet. */
export function LicenseAccessChip({ access, className }: LicenseAccessChipProps) {
  const { label, tone } = licenseAccessLabel(access)
  return (
    <Chip tone={tone} className={className}>
      {label}
    </Chip>
  )
}
