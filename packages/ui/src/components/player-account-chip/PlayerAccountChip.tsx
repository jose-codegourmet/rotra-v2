import { IdentityChip } from '@rotra/ui/identity-chip'

export type PlayerAccountChipProps = {
  /** The player finished registering (claimed their Player Information account) */
  claimed: boolean
  className?: string
}

/**
 * A player's account state in Admin: Registered or Unclaimed. The Queue IdentityChip with the two
 * states Admin lists (Admin never shows guests), so the words and tones stay the same everywhere.
 */
export function PlayerAccountChip({ claimed, className }: PlayerAccountChipProps) {
  return <IdentityChip identity={claimed ? 'registered' : 'unclaimed'} className={className} />
}
