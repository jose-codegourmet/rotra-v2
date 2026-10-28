'use client'

import { useSessionPayments } from '@rotra/data/session-payment/useSessionPayments'
import { useTogglePaid } from '@rotra/data/session-payment/useTogglePaid'
import { useMarkAllPaid } from '@rotra/data/session-payment/useMarkAllPaid'
import { PaymentsChecklist, type PaymentFilter } from '@rotra/ui/payments-checklist'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PlayerProfile } from '../player-profile/PlayerProfile'

export type PaymentsPanelProps = { sessionId: string; asSheet?: boolean; className?: string }
export function PaymentsPanel({ sessionId, asSheet, className }: PaymentsPanelProps) {
  const payments = useSessionPayments(sessionId), toggle = useTogglePaid(), markAll = useMarkAllPaid()
  const [filter, setFilter] = useState<PaymentFilter>('all')
  const [profile, setProfile] = useState<string | null>(null)
  const callbacks = { onSuccess: (outcome: { message: string }) => toast(outcome.message), onError: (error: Error) => toast.error(error.message) }
  if (payments.isError) return <QueryError query={payments} title="Couldn't load payments." />
  if (payments.isPending) return <Skeleton className="h-60 rounded-lg" />
  if (!payments.data) return null
  return <>
    <PaymentsChecklist {...payments.data} className={className} saveError={toggle.error?.message ?? markAll.error?.message} filter={filter} onFilterChange={setFilter} onTogglePaid={(clubPlayerId) => { markAll.reset(); toggle.mutate({ sessionId, clubPlayerId }, callbacks) }} onMarkAllPaid={() => { toggle.reset(); markAll.mutate(sessionId, callbacks) }} onSelectPlayer={setProfile} asSheet={asSheet} disabled={toggle.isPending || markAll.isPending} />
    <PlayerProfile clubPlayerId={profile} onClose={() => setProfile(null)} backLabel={asSheet ? 'payments' : undefined} onBack={() => setProfile(null)} />
  </>
}
