'use client'

import type { SessionRecordSummary } from '@rotra/data/queue-session/types'

export type RecordPublicTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/** The Public page tab of the session record (Q-HISTORY). Empty until Q09.6. */
export function RecordPublicTab(_props: RecordPublicTabProps) {
  // What anyone with the link sees arrives with Q09.6.
  return null
}
