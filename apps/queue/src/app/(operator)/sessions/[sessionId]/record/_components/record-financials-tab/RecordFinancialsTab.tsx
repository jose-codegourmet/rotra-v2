'use client'

import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { useSessionCostEstimate } from '@rotra/data/session-cost/useSessionCostEstimate'
import { SessionFinancialsSummary } from '@rotra/ui/session-financials-summary'
import { formatMinutes } from '@rotra/ui/forms/session-setup-form/helpers'
import { Skeleton } from '@rotra/ui/skeleton'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { PaymentsPanel } from '@/app/(operator)/sessions/[sessionId]/_components/payments-panel/PaymentsPanel'

export type RecordFinancialsTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/** Q-HISTORY: saved estimate and manual payment marks; invalid sessions have no checklist. */
export function RecordFinancialsTab({ sessionId, record }: RecordFinancialsTabProps) {
  const cost = useSessionCostEstimate(sessionId)
  if (cost.isError) return <QueryError query={cost} title="Couldn't load the cost estimate." />
  if (cost.isPending) return <Skeleton className="h-60 rounded-lg" />
  return <>
    <SessionFinancialsSummary estimate={cost.data?.estimate ?? null} courts={cost.data?.courts ?? record.courts} durationLabel={formatMinutes(cost.data?.durationMinutes ?? record.lengthMinutes)} courtFeePerCourtHour={cost.data?.saved.courtFeePerCourtHour ?? 0} shuttleLines={cost.data?.shuttleLines ?? []} />
    {record.state !== 'invalid' ? <PaymentsPanel sessionId={sessionId} className="mt-5" /> : null}
  </>
}
