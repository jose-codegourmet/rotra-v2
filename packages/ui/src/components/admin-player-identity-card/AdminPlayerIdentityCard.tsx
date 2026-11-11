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
            { label: 'Created', value: `${formatYmd(createdOn)} by ${createdBy}` },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          {rtrId
            ? 'The RTR ID never changes, including after a contact change.'
            : 'Saved by the club with a phone. The RTR ID is given when they register.'}
        </p>
      </section>
    </Card>
  )
}
