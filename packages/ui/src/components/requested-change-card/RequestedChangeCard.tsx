import type { ContactChangeSource } from '@rotra/data/contact-change-request/types'
import { Card } from '@rotra/ui/card'
import { ChangeCompare } from '@rotra/ui/change-compare'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { requestAgo } from '@rotra/ui/name-change-request-card/helpers'
import { useId } from 'react'

export type RequestedChangeCardProps = {
  /** The contact in use when the request was sent; '' shows as "Not set" */
  from: string
  to: string
  /** When the request was sent (epoch ms, ISO or Date) */
  requestedAt: number | string | Date
  source: ContactChangeSource
  /** The player's nickname or first name, as the prototype's firstName() */
  firstName: string
  /** Reference time for "2 hours ago"; stories pass the fixture's now */
  now?: Date
}

const SENT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})

/** A-CONTACT-REVIEW: the Current → Requested contact, when it was sent and where it came from. */
export function RequestedChangeCard({
  from,
  to,
  requestedAt,
  source,
  firstName,
  now = new Date(),
}: RequestedChangeCardProps) {
  const headingId = useId()
  const at = new Date(requestedAt)
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Requested change</h2>
        <ChangeCompare from={from || 'Not set'} to={to} emphasis="mono" />
        <KeyValueList
          items={[
            { label: 'Sent', value: `${SENT.format(at)} · ${requestAgo(at, now)}` },
            {
              label: 'Came from',
              value:
                source === 'app'
                  ? `${firstName}'s signed-in Player Information account`
                  : `${firstName} contacted you; you entered it`,
            },
          ]}
        />
      </section>
    </Card>
  )
}
