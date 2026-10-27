'use client'

import type { SessionRecordSummary } from '@rotra/data/queue-session/types'
import { InvalidSessionNotice } from '@rotra/ui/invalid-session-notice'

export type RecordResultsTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/**
 * The Results tab of the session record (Q-HISTORY). An invalid session shows only the
 * no-official-result notice.
 */
export function RecordResultsTab({ record }: RecordResultsTabProps) {
  if (record.state === 'invalid')
    return <InvalidSessionNotice variant="results" reason={record.invalidReason ?? undefined} />
  // Valid sessions: standings, Result slides and Download images arrive with Q08.6.
  return null
}
