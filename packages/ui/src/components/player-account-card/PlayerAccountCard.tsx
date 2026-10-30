import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { useId } from 'react'

export type PlayerAccountCardProps = {
  /** The player finished registering */
  claimed: boolean
  /** 'YYYY-MM-DD' the player registered; shown only when claimed */
  registeredOn?: string
}

/**
 * Admin player detail (A-PLAYER-DETAIL): whether the player has registered. There is deliberately no
 * password, token or claim-link prop.
 */
export function PlayerAccountCard({ claimed, registeredOn }: PlayerAccountCardProps) {
  const headingId = useId()
  let status = "Unclaimed. The club created this profile; the player hasn't finished registering."
  if (claimed) status = registeredOn ? `Registered ${formatYmd(registeredOn)}` : 'Registered'
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Account</h2>
        <KeyValueList items={[{ label: 'Status', value: status }]} />
      </section>
    </Card>
  )
}
