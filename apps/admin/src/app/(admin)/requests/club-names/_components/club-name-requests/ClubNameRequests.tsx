'use client'

import { useClubNameRequests } from '@rotra/data/club/useClubNameRequests'
import { ActivityLog } from '@rotra/ui/activity-log'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ClubLogo } from '@rotra/ui/club-logo'
import { ListRow } from '@rotra/ui/list-row'
import { requestAgo } from '@rotra/ui/name-change-request-card/helpers'
import { PageHeader } from '@rotra/ui/page-header'
import Link from 'next/link'
import { useId, useMemo } from 'react'

/**
 * Club name changes waiting on the platform owner, newest first, and the recently decided ones.
 * Review opens the club's Overview at its request card, where the decision is made (D-CLUB-NAME).
 */
export function ClubNameRequests() {
  const requests = useClubNameRequests().data
  const decidedHeadingId = useId()

  const decided = useMemo(
    () =>
      (requests?.recentlyDecided ?? []).map((event) => ({
        id: event.id,
        text: event.summary,
        at: event.at,
        actor: event.actorEmail,
      })),
    [requests],
  )

  return (
    <>
      <PageHeader
        title="Club name changes"
        description="Clubs request a new name from Club settings. It takes effect only when you approve it. Logos don't need approval."
      />
      {/* The empty, loading and error states are A02.14. */}
      <Card asChild>
        <section aria-label="Name changes waiting" className="flex flex-col">
          {(requests?.pending ?? []).map((request) => (
            <ListRow
              key={request.requestId}
              className="border-b border-border"
              leading={
                <ClubLogo
                  initials={request.initials}
                  logoUrl={request.logoUrl}
                  tone={request.accent ? 'accent' : 'default'}
                />
              }
              title={`${request.clubName} → ${request.requestedName}`}
              subtitle={`Sent ${requestAgo(request.requestedAt)} · ${request.username}`}
              trailing={
                <Button asChild size="sm">
                  <Link href={`/clubs/${request.clubId}?tab=overview#name-request`}>Review</Link>
                </Button>
              }
            />
          ))}
        </section>
      </Card>
      {decided.length ? (
        <Card asChild>
          <section aria-labelledby={decidedHeadingId} className="flex flex-col gap-3">
            <h2 id={decidedHeadingId}>Recently decided</h2>
            <ActivityLog entries={decided} emptyText="" />
          </section>
        </Card>
      ) : null}
    </>
  )
}
