import { AdminPlayerClubs } from '@rotra/ui/admin-player-clubs'
import type { SavedByClub } from '@rotra/ui/admin-player-clubs/helpers'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { useId } from 'react'

export type AdminPlayerIdentityCardProps = {
  fullName: string
  nickname?: string | null
  /** The permanent RTR ID; null for a club's unclaimed record, which gets one when they register */
  rtrId: string | null
  /** 'YYYY-MM-DD' the profile was first created (the date in the RTR ID, or when the club saved it) */
  createdOn: string
  /** The club that created the profile */
  createdBy: string
  /**
   * An unclaimed player saved by more than one club: each club with its own name for them replaces
   * the single creator (D-2026-11-16-04).
   */
  savedBy?: SavedByClub[]
}

/**
 * Admin player detail (A-PLAYER-DETAIL): the player's permanent identity. Separate from the Player
 * app's public PlayerIdentityCard (photo, copyable Player ID, owner actions); this one is read-only.
 */
export function AdminPlayerIdentityCard({
  fullName,
  nickname,
  rtrId,
  createdOn,
  createdBy,
  savedBy,
}: AdminPlayerIdentityCardProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Identity</h2>
        <KeyValueList
          items={[
            { label: 'Name', value: fullName },
            { label: 'Nickname', value: nickname || '—' },
            {
              label: 'RTR ID',
              value: rtrId ? <span className="font-mono">{rtrId}</span> : 'Not registered yet',
            },
            savedBy?.length
              ? {
                  label: 'Created',
                  value: (
                    <div className="flex flex-col gap-1">
                      <span>{formatYmd(createdOn)}</span>
                      <AdminPlayerClubs clubs={[]} savedBy={savedBy} />
                    </div>
                  ),
                }
              : { label: 'Created', value: `${formatYmd(createdOn)} by ${createdBy}` },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          {rtrId
            ? "A contact change doesn't change the RTR ID. Admin can change it from Edit profile, by changing the registration place or date."
            : 'Saved by the club with a phone. The RTR ID is given when they register.'}
        </p>
      </section>
    </Card>
  )
}
