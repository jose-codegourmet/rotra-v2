import type { RetentionState } from '@rotra/data/license/types'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { ProgressBar } from '@rotra/ui/progress-bar'
import { useId } from 'react'
import { retentionChip } from './RetentionCard.variants'

export type RetentionCardProps = {
  /** Computed upstream (A02.8); the card only formats it */
  retention: RetentionState
}

const LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`

/** The day before a 'YYYY-MM-DD' date: the last licensed day before a countdown started. */
function dayBefore(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function RetentionBody({ retention: r }: RetentionCardProps) {
  switch (r.k) {
    case 'none':
      return (
        <p className="m-0">
          No deletion countdown. If the license ends, the club's public session pages go stale and
          are deleted after six months of continuous expiry.
        </p>
      )
    case 'restored':
      return (
        <p className="m-0">
          No deletion countdown. The license ended on {formatYmd(dayBefore(r.cycle.expired))}; the
          renewal on {formatYmd(r.cycle.cancelled)} restored the public pages and cancelled that
          countdown. If the license ends again, a new six-month countdown starts.
        </p>
      )
    case 'stale':
      return (
        <>
          <div className="flex flex-col gap-1.5">
            <ProgressBar
              value={r.elapsed}
              max={r.total}
              tone="warn"
              aria-label={`${r.elapsed} of ${r.total} days of the countdown have passed`}
            />
            <div className="flex justify-between gap-3 text-xs text-fg2">
              <span>Expired {formatYmd(r.since)}</span>
              <span>Deleted {formatYmd(r.deleteOn)}</span>
            </div>
          </div>
          <KeyValueList
            items={[
              { label: 'Expired for', value: plural(r.elapsed, 'day') },
              {
                label: 'Pages deleted on',
                value: `${formatYmd(r.deleteOn)} · in ${plural(r.left, 'day')}`,
              },
            ]}
          />
          <p className="m-0">
            The public session pages are stale. Renewing before {formatYmd(r.deleteOn)} restores
            them and cancels the deletion.
          </p>
        </>
      )
    case 'due':
      return (
        <p className="m-0">
          Six months of continuous expiry ended on {formatYmd(r.deleteOn)}. Deleting the public
          pages is in progress; this changes to Pages deleted once it has actually finished.
        </p>
      )
    case 'failed':
      return (
        <>
          <KeyValueList
            items={[
              { label: 'Expired since', value: formatYmd(r.since) },
              { label: 'Deletion was due', value: formatYmd(r.deleteOn) },
              {
                label: 'Last attempt',
                value: `Failed on ${formatYmd(r.failedOn)} · will be retried`,
              },
            ]}
          />
          <p className="m-0">
            The pages are still online as stale pages; they haven't been deleted. Renewing now
            restores them and cancels the retry.
          </p>
        </>
      )
    case 'deleted':
      return (
        <p className="m-0">
          The public session pages were deleted on {formatYmd(r.on)} after six months of continuous
          expiry. Renewing gives the club Queue access again but doesn't bring these pages back.
        </p>
      )
  }
}

/**
 * Club detail › Public pages (A-RETENTION): whether the club's public session pages are live, stale
 * in the six-month countdown, being deleted, failed to delete, or deleted, and what a license end
 * keeps. Read-only: nothing here deletes a club, its players or its pages.
 */
export function RetentionCard({ retention }: RetentionCardProps) {
  const headingId = useId()
  const chip = retentionChip(retention)
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={headingId}>Public pages and retention</h2>
          </div>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
        <RetentionBody retention={retention} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-3">
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Ends with the license</span>
            <p className="m-0 text-[13px]">
              Queue app access, saved players and past reports. Later, the public session pages.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Always kept</span>
            <p className="m-0 text-[13px]">
              Players' match history and earned ranks, still under the normal three-month
              leaderboard window.
            </p>
          </div>
        </div>
        <p className="m-0 text-[13px] text-fg2">Nothing here deletes a club or its players.</p>
      </section>
    </Card>
  )
}
