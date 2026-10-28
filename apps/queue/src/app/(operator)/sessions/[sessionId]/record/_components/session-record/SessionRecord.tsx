'use client'

import { MockError } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRecord } from '@rotra/data/queue-session/useSessionRecord'
import { useSessionPublication } from '@rotra/data/session-result/useSessionPublication'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { SessionRecordHeader } from '@rotra/ui/session-record-header'
import { Skeleton } from '@rotra/ui/skeleton'
import { type TabItem, Tabs, TabsContent } from '@rotra/ui/tabs'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { RecordFinancialsTab } from '@/app/(operator)/sessions/[sessionId]/record/_components/record-financials-tab/RecordFinancialsTab'
import { RecordNightTab } from '@/app/(operator)/sessions/[sessionId]/record/_components/record-night-tab/RecordNightTab'
import { RecordPlayersTab } from '@/app/(operator)/sessions/[sessionId]/record/_components/record-players-tab/RecordPlayersTab'
import { RecordPublicTab } from '@/app/(operator)/sessions/[sessionId]/record/_components/record-public-tab/RecordPublicTab'
import { RecordResultsTab } from '@/app/(operator)/sessions/[sessionId]/record/_components/record-results-tab/RecordResultsTab'
import { sessionHref } from '@/lib/dates'

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
/** The prototype's fmtDur: "3 h" or "2 h 30 min" */
const duration = (minutes: number) => {
  let m = minutes
  if (m <= 0) m += 1440
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}

export type SessionRecordProps = { sessionId: string }

/**
 * Q-HISTORY / Q-INVALID-SESSION: Back link Home, SessionRecordHeader from useSessionRecord and the
 * five record tabs (Public page, Results, How the night ran, Players, Financials). Each tab's body
 * is its own container under record/_components/, so the later tickets fill one file each.
 */
export function SessionRecord({ sessionId }: SessionRecordProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const record = useSessionRecord(sessionId)
  const publication = useSessionPublication(sessionId)
  const [tab, setTab] = useState('results')

  const s = session.data
  const permissionError = (q: { isError: boolean; error: unknown }) =>
    q.isError && q.error instanceof MockError && q.error.kind === 'permission'
  if (permissionError(session)) notFound()
  // A session that is not finished has no record: send it to the console or its preparation.
  const redirectTo = s && s.state !== 'completed' && s.state !== 'invalid' ? sessionHref(s) : null
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo)
  }, [redirectTo, router])
  // Wait for the session before judging a record error: an unfinished session also has no record.
  if (s && !redirectTo && permissionError(record)) notFound()

  const r = record.data
  const invalid = r?.state === 'invalid'
  const when = r
    ? `${date(r.scheduledStartAt)} · ${time(r.scheduledStartAt)}–${time(r.scheduledEndAt)}`
    : ''
  const items: TabItem[] = [
    { value: 'public', label: 'Public page' },
    {
      value: 'results',
      label: 'Results',
      badges: r && !invalid ? [{ text: `${r.games} games` }] : undefined,
    },
    { value: 'night', label: 'How the night ran' },
    { value: 'players', label: 'Players', badges: r ? [{ text: String(r.players) }] : undefined },
    { value: 'financials', label: 'Financials' },
  ]

  if (record.isError && s && !redirectTo)
    return (
      <main className="mx-auto max-w-[1240px] px-4 pt-5">
        <Breadcrumb label="Home" href="/" linkAs={Link} />
        <QueryError query={record} title="Couldn't load this session record." />
      </main>
    )

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[170px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      {r ? (
        <SessionRecordHeader
          title={r.title}
          when={when}
          venue={r.venueName}
          state={r.state}
          published={!!publication.data}
          totals={{
            games: invalid ? null : r.games,
            invalidGames: r.invalidGames,
            players: r.players,
            courts: r.courts,
            length: duration(r.lengthMinutes),
          }}
        />
      ) : (
        <div
          role="status"
          aria-busy
          aria-label="Loading the session record"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="w-40" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="w-72" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>
      )}
      <Tabs aria-label="Session record" value={tab} onChange={setTab} items={items}>
        <TabsContent value="public">
          {r ? <RecordPublicTab sessionId={sessionId} record={r} /> : null}
        </TabsContent>
        <TabsContent value="results">
          {r ? <RecordResultsTab sessionId={sessionId} record={r} /> : null}
        </TabsContent>
        <TabsContent value="night">
          {r ? <RecordNightTab sessionId={sessionId} record={r} /> : null}
        </TabsContent>
        <TabsContent value="players">
          {r ? <RecordPlayersTab sessionId={sessionId} record={r} /> : null}
        </TabsContent>
        <TabsContent value="financials">
          {r ? <RecordFinancialsTab sessionId={sessionId} record={r} /> : null}
        </TabsContent>
      </Tabs>
    </main>
  )
}
