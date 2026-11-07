'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { isPermissionRefusal } from '@rotra/data/mock/errors'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionPayments } from '@rotra/data/session-payment/useSessionPayments'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { formatPeso } from '@rotra/schema/money'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { CancelledRecordRoster } from '@rotra/ui/cancelled-record-roster'
import { levelLabel } from '@rotra/ui/level-pill'
import { SessionRecordHeader } from '@rotra/ui/session-record-header'
import { Skeleton } from '@rotra/ui/skeleton'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/** The prototype's fmtWhen: "yesterday 9:00 PM" for today and yesterday, else "Mon, Nov 2 · 6:00 PM". */
function cancelledWhen(at: number, now = Date.now()) {
  const day = (x: number) => new Date(x).setHours(0, 0, 0, 0)
  const diff = Math.round((day(now) - day(at)) / 86_400_000)
  if (diff === 0) return `today ${time(at)}`
  if (diff === 1) return `yesterday ${time(at)}`
  return `${date(at)} · ${time(at)}`
}

/**
 * Q-HISTORY, cancelled form: a session cancelled before it started. SessionRecordHeader (Cancelled
 * chip, "Cancelled WHEN", the reason, totals Joined / Waitlist / Marked paid / Courts), Open public
 * page, then the read-only roster with Paid / Not paid and the waitlist. No tabs, games, standings
 * or slides.
 */
export function CancelledSessionRecord({ sessionId }: { sessionId: string }) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const payments = useSessionPayments(sessionId)
  const clubPlayers = useClubPlayers()

  if (session.isError && isPermissionRefusal(session.error)) notFound()
  const s = session.data
  const rows = roster.data
  if (session.isError || roster.isError)
    return (
      <main className="px-page pt-5">
        <Breadcrumb label="Home" href="/" linkAs={Link} />
        <QueryError
          query={session.isError ? session : roster}
          title="Couldn't load this session record."
        />
      </main>
    )

  if (!s || !rows)
    return (
      <main className="flex flex-col gap-5 px-page pt-5 pb-[170px]">
        <Breadcrumb label="Home" href="/" linkAs={Link} />
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
      </main>
    )

  const marks = new Map((payments.data?.players ?? []).map((p) => [p.clubPlayerId, p]))
  const paidPlayers = rows.roster.filter((r) => marks.get(r.clubPlayerId)?.paid)
  const nameOf = (clubPlayerId: string) =>
    clubPlayers.data?.players.find((p) => p.id === clubPlayerId)?.displayName ?? 'Player'

  return (
    <main className="flex flex-col gap-5 px-page pt-5 pb-[170px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      <SessionRecordHeader
        state="cancelled"
        title={s.title}
        when={`${date(s.scheduledStartAt)} · ${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)}`}
        venue={s.venueName}
        cancelledWhen={s.cancelledAt ? cancelledWhen(s.cancelledAt) : undefined}
        cancelReason={s.cancelReason}
        totals={{
          joined: rows.roster.length,
          slots: slotCapacity(s.courts.length, s.playersPerCourt),
          waitlist: rows.waitlist.length,
          markedPaid: paidPlayers.length,
          courts: s.courts.length,
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" asChild>
          <Link href={`/s/${s.publicSlug}`}>Open public page</Link>
        </Button>
      </div>
      <CancelledRecordRoster
        roster={rows.roster.map((r) => {
          const paid = marks.get(r.clubPlayerId)?.paid
          return {
            id: r.id,
            name: r.nameSnapshot,
            photoUrl: marks.get(r.clubPlayerId)?.picture,
            levelLabel: levelLabel(r.level),
            paidLabel: paid ? `Paid ${formatPeso(paid.amount)}` : 'Not paid',
          }
        })}
        waitlist={rows.waitlist.map((w) => ({ id: w.id, name: nameOf(w.clubPlayerId) }))}
      />
    </main>
  )
}
