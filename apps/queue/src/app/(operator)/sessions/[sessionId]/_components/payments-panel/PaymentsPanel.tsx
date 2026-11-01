'use client'

import { useSessionPayments } from '@rotra/data/session-payment/useSessionPayments'
import { useSetPaymentMarks } from '@rotra/data/session-payment/useSetPaymentMarks'
import { type PaymentFilter, PaymentsChecklist } from '@rotra/ui/payments-checklist'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PlayerProfile } from '../player-profile/PlayerProfile'

export type PaymentsPanelProps = { sessionId: string; asSheet?: boolean; className?: string }
export function PaymentsPanel({ sessionId, asSheet, className }: PaymentsPanelProps) {
  const payments = useSessionPayments(sessionId)
  const marks = useSetPaymentMarks(sessionId, {
    onSuccess: (outcome) => toast(outcome.message),
    onError: (error) => toast.error(error.message),
  })
  const [filter, setFilter] = useState<PaymentFilter>('all')
  const [profile, setProfile] = useState<string | null>(null)
  if (payments.isError) return <QueryError query={payments} title="Couldn't load payments." />
  if (payments.isPending) return <Skeleton className="h-60 rounded-lg" />
  if (!payments.data) return null
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
        asSheet={asSheet}
      />
      <PlayerProfile
        clubPlayerId={profile}
        onClose={() => setProfile(null)}
        backLabel={asSheet ? 'payments' : undefined}
        onBack={() => setProfile(null)}
      />
    </>
  )
}
