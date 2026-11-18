import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { useId } from 'react'

export type PlayerAccountCardProps = {
  /** The player finished registering */
  claimed: boolean
  /** 'YYYY-MM-DD' the player registered; shown only when claimed */
  registeredOn?: string
  /**
   * An older unclaimed record with a phone and no email (D-2026-11-16-04): shows the Details required
   * notice. Ignored when claimed.
   */
  detailsRequired?: boolean
  /** The club that must add an email or delete the record; "The club" without it */
  clubName?: string
}

/**
 * Admin player detail (A-PLAYER-DETAIL): whether the player has registered. There is deliberately no
 * password, token or claim-link prop.
 */
export function PlayerAccountCard({
  claimed,
  registeredOn,
  detailsRequired = false,
  clubName,
}: PlayerAccountCardProps) {
  const headingId = useId()
  let status = "Unclaimed. The player hasn't finished registering."
  if (claimed) status = registeredOn ? `Registered ${formatYmd(registeredOn)}` : 'Registered'
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Account</h2>
        <KeyValueList items={[{ label: 'Status', value: status }]} />
        {detailsRequired && !claimed ? (
          <Notice tone="warn" title="Details required.">
            This older record has a phone and no email. {clubName || 'The club'} must add an email or
            delete the record.
          </Notice>
        ) : null}
      </section>
    </Card>
  )
}
