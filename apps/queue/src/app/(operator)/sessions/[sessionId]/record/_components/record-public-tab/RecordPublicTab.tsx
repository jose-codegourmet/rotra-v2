'use client'

import { usePublicSession } from '@rotra/data/public-session/usePublicSession'
import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionPublication } from '@rotra/data/session-result/useSessionPublication'
import { PublicPageSummary } from '@rotra/ui/public-page-summary'
import { ParticipantCard } from '@rotra/ui/public-participants/participant-card'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PublishResultsSheet } from '@/app/(operator)/sessions/[sessionId]/results/_components/publish-results-sheet/PublishResultsSheet'

export type RecordPublicTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

const MODE_LABELS = { chill: 'Chill', fair: 'Fair', hard: 'Hard' } as const

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
/** The prototype's fmtDate: "Thu, Oct 23" */
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * The Public page tab of the session record (Q-HISTORY): PublicPageSummary with what anyone with
 * the link sees (usePublicSession), what results are on the page (useSessionPublication) and the
 * participant cards. Open public page opens the operator preview; Publish results / Update
 * publication opens PublishResultsSheet, never for an invalid session.
 */
export function RecordPublicTab({ sessionId, record }: RecordPublicTabProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const page = usePublicSession(session.data?.publicSlug ?? '')
  const publication = useSessionPublication(sessionId)
  const [publishOpen, setPublishOpen] = useState(false)

  const p = page.data
  if (!p || publication.isPending) return null

  const invalid = record.state === 'invalid'
  const pub = publication.data ?? null

  return (
    <>
      <PublicPageSummary
        invalid={invalid}
        details={{
          when: `${date(p.start)}, ${time(p.start)}–${time(p.end)}`,
          venue: p.venue.name,
          courts: p.courts.length,
          formats:
            [p.formats.singles && 'Singles', p.formats.doubles && 'Doubles']
              .filter(Boolean)
              .join(' + ') || 'No standard format',
          mode: MODE_LABELS[p.mode],
          minimum: p.minimum,
        }}
        publication={
          pub && !invalid
            ? {
                standings: pub.publishedSlides.includes('standings'),
                awards: pub.publishedSlides.includes('awards'),
                offDay: pub.includeOffDay,
                publishedAt: `${date(pub.publishedAt)} · ${time(pub.publishedAt)}`,
              }
            : null
        }
        participantCount={p.participants.length}
        onOpenPublicPage={() => router.push(`/sessions/${sessionId}/public-page`)}
        onPublish={() => setPublishOpen(true)}
      >
        {p.participants.map((x, i) => (
          <ParticipantCard
            // The public projection carries no ids; order is the roster order.
            key={i}
            name={x.name}
            pictureUrl={x.pictureUrl}
            hasProfile={x.hasRotraProfile}
          />
        ))}
      </PublicPageSummary>
      {invalid ? null : (
        <PublishResultsSheet
          sessionId={sessionId}
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
      )}
    </>
  )
}
