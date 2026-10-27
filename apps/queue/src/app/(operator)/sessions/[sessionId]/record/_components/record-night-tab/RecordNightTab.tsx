'use client'

import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { InvalidSessionNotice } from '@rotra/ui/invalid-session-notice'

export type RecordNightTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/**
 * The How the night ran tab of the session record (Q-HISTORY). An invalid session shows the
 * no-match-history notice.
 */
export function RecordNightTab({ record }: RecordNightTabProps) {
  if (record.state === 'invalid') return <InvalidSessionNotice variant="night" />
  // Valid sessions: the replay card and the per-court match history arrive with Q08.6.
  return null
}
