'use client'

import type { SessionRecordSummary } from '@rotra/data/queue-session/types'

export type RecordFinancialsTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/** The Financials tab of the session record (Q-HISTORY). Empty until Q10.8. */
export function RecordFinancialsTab(_props: RecordFinancialsTabProps) {
  // The saved cost estimate and the payments checklist arrive with Q10.8.
  return null
}
