import { Card } from '@rotra/ui/card'
import { type KeyValueItem, KeyValueList } from '@rotra/ui/key-value-list'
import { useId } from 'react'

export type ClubIdentityCardProps = {
  foundingAddress: string
  /** e.g. "PH-CEB" */
  cityCode: string
  /** Names the club had before approved name changes; the row is hidden when empty */
  earlierNames?: string[]
}

/** Club detail › Overview: the fixed founding address and city code, and any earlier names. */
export function ClubIdentityCard({
  foundingAddress,
  cityCode,
  earlierNames = [],
}: ClubIdentityCardProps) {
  const headingId = useId()
  const items: KeyValueItem[] = [
    { label: 'Founding address', value: foundingAddress },
    {
      label: 'City code',
      value: (
        <>
          <span className="font-mono">{cityCode}</span> · used in new players' RTR IDs
        </>
      ),
    },
  ]
  if (earlierNames.length > 0) {
    items.push({ label: 'Earlier names', value: earlierNames.join(', ') })
  }
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Identity</h2>
        <KeyValueList items={items} />
        <p className="m-0 text-[13px] text-fg2">
          The founding address and city code are fixed. Sessions at other venues don't change them.
          The club changes its own logo.
        </p>
      </section>
    </Card>
  )
}
