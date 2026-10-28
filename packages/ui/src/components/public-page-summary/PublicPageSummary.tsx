import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { ReactNode } from 'react'

/** The Details card: the public page's session facts, already formatted by the container. */
export type PublicPageSummaryDetails = {
  /** "date, start–end", e.g. "Thu, Oct 23, 7:00 PM–10:00 PM" */
  when: string
  venue: string
  courts: number
  /** "Doubles", "Singles + Doubles" or "No standard format" */
  formats: string
  /** The mode label, e.g. "Fair" */
  mode: string
  /** The N in "N games per player" */
  minimum: number
}

/** What the publication put on the page. null until the Queue Master publishes. */
export type PublicPageSummaryPublication = {
  standings: boolean
  awards: boolean
  /** Off Day was explicitly included: "Shared"; otherwise "Private" */
  offDay: boolean
  /** "date · time", e.g. "Thu, Oct 23 · 10:14 PM" */
  publishedAt: string
}

export type PublicPageSummaryProps = {
  /** Invalid sessions have no results to share and no publish action */
  invalid: boolean
  details: PublicPageSummaryDetails
  publication: PublicPageSummaryPublication | null
  /** The N in "Participants · N" */
  participantCount: number
  /** The participant cards (ParticipantCard from PublicParticipants), laid out in the grid */
  children?: ReactNode
  onOpenPublicPage: () => void
  /** Publish results, or Update publication once published. Not rendered for invalid sessions */
  onPublish: () => void
  className?: string
}

const sharedLabel = (p: PublicPageSummaryPublication) =>
  [p.standings && 'Standings', p.awards && 'Awards'].filter(Boolean).join(' and ') || 'Nothing'

/**
 * The session record's Public page tab (Q-HISTORY › Public page): what anyone with the session link
 * sees. Heading and actions (Open public page; Publish results / Update publication for valid
 * sessions), the Details card, the "Results on the page" card (shared slides, Off Day shared or
 * private and the publish time; "Not shared yet…"; or the invalid copy) and the Participants grid.
 * Read-only: publishing happens in the Publish results sheet, reached through onPublish.
 */
export function PublicPageSummary({
  invalid,
  details,
  publication,
  participantCount,
  children,
  onOpenPublicPage,
  onPublish,
  className,
}: PublicPageSummaryProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2>Public page</h2>
          <p className="m-0 text-[13px] text-fg2">
            What anyone with the session link sees. No sign-in needed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onOpenPublicPage}>
            Open public page
          </Button>
          {invalid ? null : (
            <Button size="sm" variant="primary" onClick={onPublish}>
              {publication ? 'Update publication' : 'Publish results'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
        <Card asChild className="flex flex-col gap-3">
          <section aria-labelledby="public-page-details-heading">
            <h3 id="public-page-details-heading">Details</h3>
            <KeyValueList
              items={[
                { label: 'When', value: details.when },
                { label: 'Venue', value: details.venue },
                { label: 'Courts', value: details.courts },
                { label: 'Formats', value: details.formats },
                { label: 'Mode', value: details.mode },
                { label: 'Minimum', value: `${details.minimum} games per player` },
              ]}
            />
          </section>
        </Card>
        <Card asChild className="flex flex-col gap-3">
          <section aria-labelledby="public-page-results-heading">
            <h3 id="public-page-results-heading">Results on the page</h3>
            {invalid ? (
              <p className="m-0 text-[13px] text-fg2">Invalid sessions have no results to share.</p>
            ) : publication ? (
              <KeyValueList
                items={[
                  { label: 'Shared', value: sharedLabel(publication) },
                  { label: 'Off Day', value: publication.offDay ? 'Shared' : 'Private' },
                  { label: 'Published', value: publication.publishedAt },
                ]}
              />
            ) : (
              <p className="m-0 text-[13px] text-fg2">
                Not shared yet. The page says results haven't been shared. Player records and ranks
                are already updated either way.
              </p>
            )}
          </section>
        </Card>
      </div>

      <section aria-labelledby="public-page-participants-heading" className="flex flex-col gap-3">
        <h3 id="public-page-participants-heading">Participants · {participantCount}</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-2.5">
          {children}
        </div>
      </section>
    </div>
  )
}
