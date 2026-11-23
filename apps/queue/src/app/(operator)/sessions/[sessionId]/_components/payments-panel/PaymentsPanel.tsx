'use client'

import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { statusForReceived } from '@rotra/data/session-payment/rules'
import { useSessionPayments } from '@rotra/data/session-payment/useSessionPayments'
import { useSetPaymentAmount } from '@rotra/data/session-payment/useSetPaymentAmount'
import { useSetPaymentMarks } from '@rotra/data/session-payment/useSetPaymentMarks'
import { PaymentAmountForm } from '@rotra/ui/forms/payment-amount-form'
import { paymentAmountInputFrom } from '@rotra/ui/forms/payment-amount-form/default-values'
import type { PaymentAmountFormValues } from '@rotra/ui/forms/payment-amount-form/schema'
import { type PaymentFilter, PaymentsChecklist } from '@rotra/ui/payments-checklist'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { SlotTransferHistory } from '@rotra/ui/slot-transfer-history'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { shortDateLabel } from '@/lib/dates'
import { PaymentStatusShareDialog } from '@/lib/PaymentStatusShareDialog'
import { useClubPlayerPictures } from '@/lib/useClubPlayerPictures'
import { PlayerProfile } from '../player-profile/PlayerProfile'

export type PaymentsPanelProps = { sessionId: string; asSheet?: boolean; className?: string }
export function PaymentsPanel({ sessionId, asSheet, className }: PaymentsPanelProps) {
  const payments = useSessionPayments(sessionId)
  const { pictureOf } = useClubPlayerPictures()
  const marks = useSetPaymentMarks(sessionId, {
    onSuccess: (outcome) => toast(outcome.message),
    onError: (error) => toast.error(error.message),
  })
  const amount = useSetPaymentAmount()
  const session = useQueueSession(sessionId)
  const [sharing, setSharing] = useState(false)
  const [filter, setFilter] = useState<PaymentFilter>('all')
  const [profile, setProfile] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  // #1013: the Slot history of a card whose slot came by transfer (read-only)
  const [history, setHistory] = useState<string | null>(null)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)
  if (payments.isError) return <QueryError query={payments} title="Couldn't load payments." />
  if (payments.isPending) return <Skeleton className="h-60 rounded-lg" />
  if (!payments.data) return null
  const { amountDue } = payments.data
  const editingPlayer = payments.data.players.find((p) => p.clubPlayerId === editing)
  const historyPlayer = payments.data.players.find((p) => p.clubPlayerId === history && p.transfer)

  const closeEditor = () => {
    if (amount.isPending) return
    setEditing(null)
    amount.reset()
  }
  /**
   * #479: pending switch changes save first (their own toast or error), so the typed amount is the
   * newer intent. A failed amount save keeps the sheet open with the typed amount.
   */
  const saveAmount = async ({ amount: amountMinor }: PaymentAmountFormValues) => {
    if (!editingPlayer || amount.isPending || sending.current) return
    sending.current = true
    try {
      await marks.flush()
    } catch {
      sending.current = false
      return
    }
    amount.mutate(
      { sessionId, clubPlayerId: editingPlayer.clubPlayerId, amountMinor },
      {
        onSettled: () => {
          sending.current = false
        },
        onSuccess: (outcome) => {
          setEditing(null)
          amount.reset()
          toast(outcome.message)
        },
      },
    )
  }

  return (
    <>
      <PaymentsChecklist
        {...payments.data}
        // The saved player's own picture (or character) when the read carries none (real mode).
        players={payments.data.players.map((p) => ({
          ...p,
          picture: p.picture ?? pictureOf(p.clubPlayerId) ?? null,
        }))}
        className={className}
        saveError={marks.error?.message}
        filter={filter}
        onFilterChange={setFilter}
        onTogglePaid={(clubPlayerId) => {
          const player = payments.data?.players.find((p) => p.clubPlayerId === clubPlayerId)
          if (player) marks.set(clubPlayerId, !player.paid)
        }}
        onMarkAllPaid={marks.markAll}
        onShareStatus={() => setSharing(true)}
        onSelectPlayer={setProfile}
        onEditAmount={(clubPlayerId) => {
          amount.reset()
          setEditing(clubPlayerId)
        }}
        onOpenSlotHistory={setHistory}
        asSheet={asSheet}
      />
      <PaymentStatusShareDialog
        open={sharing}
        onOpenChange={setSharing}
        heading={
          session.data
            ? `${session.data.title} · ${shortDateLabel(session.data.scheduledStartAt)}`
            : 'Session'
        }
        amountDue={amountDue}
        rows={payments.data.players.map((p) => ({
          name: p.name,
          receivedMinor: p.paid?.amount ?? null,
          // #1013: a transferred slot's waivers lower its balance; they are never collected.
          waivedMinor: p.transfer?.waivedMinor ?? 0,
          viaTransfer: !!p.transfer,
        }))}
      />
      <Sheet
        open={!!historyPlayer}
        onOpenChange={(next) => {
          if (!next) setHistory(null)
        }}
        title={historyPlayer ? `Slot history · ${historyPlayer.name}` : 'Slot history'}
      >
        {historyPlayer?.transfer ? (
          <SlotTransferHistory
            holderName={historyPlayer.name}
            transfer={historyPlayer.transfer}
            cashMinor={historyPlayer.paid?.amount ?? 0}
            status={historyPlayer.status}
          />
        ) : null}
      </Sheet>
      <Sheet
        open={!!editingPlayer}
        onOpenChange={(next) => {
          if (!next) closeEditor()
        }}
        title={editingPlayer ? `Payment from ${editingPlayer.name}` : 'Payment'}
        hideClose={amount.isPending}
        dismissible={!amount.isPending}
      >
        {editingPlayer ? (
          <PaymentAmountForm
            key={editingPlayer.clubPlayerId}
            amountDue={amountDue}
            defaultValues={paymentAmountInputFrom(editingPlayer.paid?.amount, amountDue)}
            previewStatus={(received) => statusForReceived(received, amountDue)}
            onSubmit={saveAmount}
            onCancel={closeEditor}
            isPending={amount.isPending}
            serverError={amount.error?.message}
          />
        ) : null}
      </Sheet>
      <PlayerProfile
        clubPlayerId={profile}
        onClose={() => setProfile(null)}
        backLabel={asSheet ? 'payments' : undefined}
        onBack={() => setProfile(null)}
      />
    </>
  )
}
