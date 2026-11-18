import { Chip } from '@rotra/ui/chip'
import { IDENTITY_LABEL, IDENTITY_TONE, type Identity } from './IdentityChip.variants'

export type IdentityChipProps = {
  identity: Identity
  /**
   * An older unclaimed record with no email (D-2026-11-16-04): the warn "Details required" chip
   * takes the place of the Unclaimed chip. Ignored for other identities.
   */
  detailsRequired?: boolean
  className?: string
}

/** A player's identity on Queue screens: Registered, Unclaimed, Guest or Lookup pending. */
export function IdentityChip({ identity, detailsRequired = false, className }: IdentityChipProps) {
  if (detailsRequired && identity === 'unclaimed') {
    return (
      <Chip tone="warn" className={className}>
        Details required
      </Chip>
    )
  }
  return (
    <Chip tone={IDENTITY_TONE[identity]} className={className}>
      {IDENTITY_LABEL[identity]}
    </Chip>
  )
}
