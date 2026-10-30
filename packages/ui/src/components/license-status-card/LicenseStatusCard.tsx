import type { ClubAccessState } from '@rotra/data/license/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { type KeyValueItem, KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { useId } from 'react'

export type LicenseStatusCardProps = {
  /** Computed upstream (A02.8); the card only formats it */
  access: ClubAccessState
  /** Whether any term was ever recorded: Renew license, else Activate license */
  hasTerms: boolean
  /** Opens the License sheet; the button renders only when it is passed */
  onOpenLicense?: () => void
  /** 'YYYY-MM-DD' for "N days ago" on an expired license; defaults to today in Manila */
  today?: string
}

const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`

/** Whole days from one calendar date to another, read in UTC so no time zone can shift them. */
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

const manilaToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())

function accessLines(access: ClubAccessState, today: string): KeyValueItem[] {
  switch (access.state) {
    case 'active':
      return [
        {
          label: 'Access',
          value: (
            <>
              Active until <b>{formatYmd(access.until)}</b> · {plural(access.days, 'day')} left
            </>
          ),
        },
        { label: 'Plan', value: access.plan },
      ]
    case 'expired':
      return [
        {
          label: 'Access',
          value: `Ended ${formatYmd(access.ended)} · ${plural(daysBetween(access.since, today), 'day')} ago`,
        },
        { label: 'Last plan', value: access.plan },
        ...(access.next ? [{ label: 'Next term', value: `Starts ${formatYmd(access.next)}` }] : []),
      ]
    case 'scheduled':
      return [
        { label: 'Access', value: `Starts ${formatYmd(access.starts)}` },
        { label: 'Plan', value: access.plan },
      ]
    case 'none':
      return [
        { label: 'Access', value: "Never licensed. The club can sign in but can't run sessions." },
      ]
  }
}

/** Club detail › License: the club's access now, and Activate or Renew license. */
export function LicenseStatusCard({
  access,
  hasTerms,
  onOpenLicense,
  today = manilaToday(),
}: LicenseStatusCardProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={headingId}>License</h2>
            <p className="m-0 text-[13px] text-fg2">
              Monthly or yearly. You activate or renew after the club pays outside ROTRA.
            </p>
          </div>
          {onOpenLicense ? (
            <Button size="sm" variant="primary" onClick={onOpenLicense}>
              {hasTerms ? 'Renew license' : 'Activate license'}
            </Button>
          ) : null}
        </div>
        <KeyValueList items={accessLines(access, today)} />
        <p className="m-0 text-[13px] text-fg2">
          One active session at a time, on any venue or device. Renewing doesn't change that.
        </p>
      </section>
    </Card>
  )
}
