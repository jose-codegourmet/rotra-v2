'use client'

import { useClub } from '@rotra/data/club'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { MockError } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRecord } from '@rotra/data/queue-session/useSessionRecord'
import { useSessionPublication } from '@rotra/data/session-result/useSessionPublication'
import { useSessionResults } from '@rotra/data/session-result/useSessionResults'
import { AwardsSlide } from '@rotra/ui/awards-slide'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { OffDaySlide } from '@rotra/ui/off-day-slide'
import { ResultsHeader } from '@rotra/ui/results-header'
import { Skeleton } from '@rotra/ui/skeleton'
import { StandingsSlide } from '@rotra/ui/standings-slide'
import { type TabItem, Tabs, TabsContent } from '@rotra/ui/tabs'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { ExportImagesSheetContainer } from '@/app/(operator)/sessions/[sessionId]/results/_components/export-images-sheet/ExportImagesSheetContainer'
import { PublishResultsSheet } from '@/app/(operator)/sessions/[sessionId]/results/_components/publish-results-sheet/PublishResultsSheet'

export type SessionResultsProps = { sessionId: string }

const SLIDES: TabItem[] = [
  { value: 'standings', label: '1. Standings' },
  { value: 'awards', label: '2. Awards' },
  { value: 'off-day', label: '3. Off Day' },
]

/** The prototype's fmtDate: "Thu, Oct 23" */
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

const isPermission = (q: { isError: boolean; error: unknown }) =>
  q.isError && q.error instanceof MockError && q.error.kind === 'permission'

/**
 * Q-RESULTS: the private results view after Session done or from a record's Result slides. Back
 * link Home, ResultsHeader (status chips and actions), the three slide tabs (local state) and the
 * chosen slide from useSessionResults; the Off Day slide is the private variant. Publish results /
 * Update publication and Download images open their sheet containers.
 */
export function SessionResults({ sessionId }: SessionResultsProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const record = useSessionRecord(sessionId)
  const results = useSessionResults(sessionId)
  const publication = useSessionPublication(sessionId)
  const club = useClub(DEMO_CLUB_ID)
  const [slide, setSlide] = useState('standings')
  const [publishOpen, setPublishOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  if (isPermission(session)) notFound()

  const s = session.data
  const r = record.data
  const snapshot = results.data
  const c = club.data

  if (session.isError || results.isError)
    return (
      <main className="mx-auto max-w-[1240px] px-4 pt-5">
        <Breadcrumb label="Home" href="/" linkAs={Link} />
        <QueryError
          query={session.isError ? session : results}
          title="Couldn't load these results."
        />
      </main>
    )

  const ready = s && r && snapshot && c && !publication.isPending
  const frame = ready
    ? {
        club: { name: c.name, initials: c.initials, logoUrl: c.logoUrl },
        sessionLine: `${s.title} · ${date(s.scheduledStartAt)}`,
        venue: s.venueName,
      }
    : null
  const pub = publication.data ?? null

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[170px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      {ready && frame ? (
        <>
          <ResultsHeader
            title={s.title}
            date={date(s.scheduledStartAt)}
            venue={s.venueName}
            gameCount={r.games}
            published={pub !== null}
            offDayShared={pub?.includeOffDay === true}
            onMatchHistory={() => router.push(`/sessions/${sessionId}/record`)}
            onViewPublicPage={() => router.push(`/sessions/${sessionId}/public-page`)}
            onDownloadImages={() => setExportOpen(true)}
            onPublish={() => setPublishOpen(true)}
          />
          <Tabs aria-label="Result slides" value={slide} onChange={setSlide} items={SLIDES}>
            <TabsContent value="standings">
              <StandingsSlide {...frame} rows={snapshot.standings} />
            </TabsContent>
            <TabsContent value="awards">
              <AwardsSlide
                {...frame}
                mvp={snapshot.awards.mvp}
                mostImproved={snapshot.awards.mostImproved}
                showFormulaNote={snapshot.calculationVersion === 'prototype-reference'}
              />
            </TabsContent>
            <TabsContent value="off-day">
              <OffDaySlide
                {...frame}
                variant="private"
                rows={snapshot.awards.offDay.map((x) => ({
                  name: x.name,
                  priorSessions: x.priorSessions,
                }))}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div
          role="status"
          aria-busy
          aria-label="Loading the session results"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="w-40" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-56 rounded-full" />
            <Skeleton className="h-7 w-40 rounded-full" />
          </div>
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      )}
      <PublishResultsSheet sessionId={sessionId} open={publishOpen} onOpenChange={setPublishOpen} />
      <ExportImagesSheetContainer
        sessionId={sessionId}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </main>
  )
}
