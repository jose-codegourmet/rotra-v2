'use client'

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
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PlayerProfile } from '../player-profile/PlayerProfile'

export type PaymentsPanelProps = { sessionId: string; asSheet?: boolean; className?: string }
export function PaymentsPanel({ sessionId, asSheet, className }: PaymentsPanelProps) {
  const payments = useSessionPayments(sessionId)
  const marks = useSetPaymentMarks(sessionId, {
    onSuccess: (outcome) => toast(outcome.message),
    onError: (error) => toast.error(error.message),
  })
  const amount = useSetPaymentAmount()
  const [filter, setFilter] = useState<PaymentFilter>('all')
  const [profile, setProfile] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)
  if (payments.isError) return <QueryError query={payments} title="Couldn't load payments." />
  if (payments.isPending) return <Skeleton className="h-60 rounded-lg" />
  if (!payments.data) return null
  const { amountDue } = payments.data
  const editingPlayer = payments.data.players.find((p) => p.clubPlayerId === editing)

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
        className={className}
        saveError={marks.error?.message}
        filter={filter}
        onFilterChange={setFilter}
        onTogglePaid={(clubPlayerId) => {
          const player = payments.data?.players.find((p) => p.clubPlayerId === clubPlayerId)
          if (player) marks.set(clubPlayerId, !player.paid)
        }}
        onMarkAllPaid={marks.markAll}
        onSelectPlayer={setProfile}
        onEditAmount={(clubPlayerId) => {
          amount.reset()
          setEditing(clubPlayerId)
        }}
        asSheet={asSheet}
      />
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
