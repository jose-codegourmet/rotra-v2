'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useConnectivity } from '@rotra/data/connectivity/useConnectivity'
import { isPermissionRefusal } from '@rotra/data/mock/errors'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { refundList } from '@rotra/data/session-payment/refund-rules'
import { useRecordSessionRefund } from '@rotra/data/session-payment/useRecordSessionRefund'
import { useSessionPayments } from '@rotra/data/session-payment/useSessionPayments'
import { queueMasterName } from '@rotra/data/session-roster/sessionRoster.rules'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { formatPeso } from '@rotra/schema/money'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { CancelledRecordRoster } from '@rotra/ui/cancelled-record-roster'
import { levelLabel } from '@rotra/ui/level-pill'
import { RefundConfirmSheet } from '@rotra/ui/refund-confirm-sheet'
import { RefundList } from '@rotra/ui/refund-list'
import { SessionRecordHeader } from '@rotra/ui/session-record-header'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useState } from 'react'
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
 * page, then (#1014, owner decision 2026-11-22) **Refund everyone who paid**: each paid or
 * partially paid player with the whole cash to hand back outside ROTRA and Record refund
 * (RefundConfirmSheet; one append-only refund per player), then the read-only roster with Paid /
 * Not paid and the waitlist. No tabs, games, standings or slides.
 */
export function CancelledSessionRecord({ sessionId }: { sessionId: string }) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const payments = useSessionPayments(sessionId)
  const clubPlayers = useClubPlayers()
  const online = useConnectivity().online
  const recordRefund = useRecordSessionRefund()
  // The player whose Record refund confirmation is open
  const [refundEntry, setRefundEntry] = useState<string | null>(null)

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
  // `paid.amount` is the cash kept (net of a refund); the cash received is that plus the refund.
  const receivedOf = (clubPlayerId: string) => {
    const p = marks.get(clubPlayerId)
    return (p?.paid?.amount ?? 0) + (p?.refund?.amount ?? 0)
  }
  const paidPlayers = rows.roster.filter((r) => receivedOf(r.clubPlayerId) > 0)
  const refunds = refundList(
    rows.roster
      .map((r) => {
        const p = marks.get(r.clubPlayerId)
        return {
          entryId: r.id,
          name: queueMasterName(r),
          receivedMinor: receivedOf(r.clubPlayerId),
          waivedMinor: p?.transfer?.waivedMinor ?? 0,
          refund: p?.refund ? { amountMinor: p.refund.amount, refundedAt: p.refund.at } : null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    payments.data?.amountDue ?? null,
  )
  const refunding = refunds.rows.find((r) => r.entryId === refundEntry && !r.recorded)
  const photoOf = (entryId: string) =>
    marks.get(rows.roster.find((r) => r.id === entryId)?.clubPlayerId ?? '')?.picture
  const confirmRefund = () => {
    if (!refunding || recordRefund.isPending) return
    recordRefund.mutate(
      { sessionId, sessionPlayerId: refunding.entryId, expectedAmountMinor: refunding.amountMinor },
      {
        onSuccess: (result) => {
          setRefundEntry(null)
          toast(result.message)
        },
      },
    )
  }
  const nameOf = (clubPlayerId: string) =>
    clubPlayers.data?.players.find((p) => p.id === clubPlayerId)?.displayName ?? 'Player'

  return (
    <main className="flex flex-col gap-5 px-page pt-5 pb-[170px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      <SessionRecordHeader
        state="cancelled"
        title={s.title}
        titleHref={`/sessions/${sessionId}/public-page`}
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
      {refunds.rows.length ? (
        <RefundList
          rows={refunds.rows.map((r) => ({ ...r, photoUrl: photoOf(r.entryId) }))}
          leftMinor={refunds.leftMinor}
          leftCount={refunds.leftCount}
          refundedMinor={refunds.refundedMinor}
          whenLabel={(at) => cancelledWhen(at)}
          onRecord={(entryId) => {
            recordRefund.reset()
            setRefundEntry(entryId)
          }}
          disabled={!online || recordRefund.isPending}
          disabledReason={online ? undefined : "You're offline. Reconnect and try again."}
        />
      ) : null}
      {refunding ? (
        <RefundConfirmSheet
          open
          onOpenChange={(open) => {
            if (!open && !recordRefund.isPending) setRefundEntry(null)
          }}
          variant="session"
          name={refunding.name}
          amountMinor={refunding.amountMinor}
          onConfirm={confirmRefund}
          isPending={recordRefund.isPending}
          error={recordRefund.error instanceof Error ? recordRefund.error.message : undefined}
        />
      ) : null}
      <CancelledRecordRoster
        roster={rows.roster.map((r) => {
          const received = receivedOf(r.clubPlayerId)
          const refunded = marks.get(r.clubPlayerId)?.refund
          return {
            id: r.id,
            name: queueMasterName(r),
            photoUrl: marks.get(r.clubPlayerId)?.picture,
            levelLabel: levelLabel(r.level),
            paidLabel: refunded
              ? `Paid ${formatPeso(received)} · refunded`
              : received > 0
                ? `Paid ${formatPeso(received)}`
                : 'Not paid',
          }
        })}
        waitlist={rows.waitlist.map((w) => ({ id: w.id, name: nameOf(w.clubPlayerId) }))}
      />
    </main>
  )
}
