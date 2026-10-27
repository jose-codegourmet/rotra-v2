import { Chip } from '@rotra/ui/chip'
import { IDENTITY_LABEL, IDENTITY_TONE, type Identity } from './IdentityChip.variants'

export type IdentityChipProps = {
  identity: Identity
  className?: string
}

/** A player's identity on Queue screens: Registered, Unclaimed, Guest or Lookup pending. */
export function IdentityChip({ identity, className }: IdentityChipProps) {
  return (
    <Chip tone={IDENTITY_TONE[identity]} className={className}>
      {IDENTITY_LABEL[identity]}
    </Chip>
  )
}
