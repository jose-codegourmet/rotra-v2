import type { ClubPlayer } from '@rotra/data/club-player/types'

export type Identity = ClubPlayer['identity']

// The Queue prototype's IDENT labels and identChip() tones.
export const IDENTITY_LABEL: Record<Identity, string> = {
  registered: 'Registered',
  unclaimed: 'Unclaimed',
  guest: 'Guest',
  pending: 'Lookup pending',
}

export const IDENTITY_TONE = {
  registered: 'accent',
  unclaimed: 'neutral',
  guest: 'neutral',
  pending: 'warn',
} as const satisfies Record<Identity, 'accent' | 'neutral' | 'warn'>
