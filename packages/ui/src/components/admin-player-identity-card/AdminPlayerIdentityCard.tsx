import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { useId } from 'react'

export type AdminPlayerIdentityCardProps = {
  fullName: string
  nickname?: string | null
  rtrId: string
  /** 'YYYY-MM-DD' the profile was first created (the date in the RTR ID) */
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
            { label: 'RTR ID', value: <span className="font-mono">{rtrId}</span> },
            { label: 'Created', value: `${formatYmd(createdOn)} by ${createdBy}` },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          The RTR ID never changes, including after a contact change.
        </p>
      </section>
    </Card>
  )
}
