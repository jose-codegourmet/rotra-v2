'use client'

import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionIntegrity } from '@rotra/data/sync/useSessionIntegrity'
import { DeviceContinueNotice } from '@rotra/ui/device-continue-notice'

export type ConsoleDeviceNoticeProps = { sessionId: string }
export function ConsoleDeviceNotice({ sessionId }: ConsoleDeviceNoticeProps) {
  const session = useQueueSession(sessionId),
    integrity = useSessionIntegrity(sessionId)
  if (!session.data || !integrity.data?.secondDevice) return null
  return (
    <DeviceContinueNotice
      sessionTitle={session.data.title}
      snapshotAt={integrity.data.snapshotAt ?? null}
    />
  )
}
