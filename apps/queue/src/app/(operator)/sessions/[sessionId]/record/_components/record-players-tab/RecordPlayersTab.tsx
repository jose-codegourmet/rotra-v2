'use client'

import type { SessionRecordSummary } from '@rotra/data/queue-session/types'

export type RecordPlayersTabProps = {
  sessionId: string
  record: SessionRecordSummary
}

/** The Players tab of the session record (Q-HISTORY). Empty until Q08.6. */
export function RecordPlayersTab(_props: RecordPlayersTabProps) {
  // A card per roster player (and "Not counted" on invalid sessions) arrives with Q08.6.
  return null
}
