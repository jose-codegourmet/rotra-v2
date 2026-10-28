'use client'

import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'

export type UnrecoverableSessionPanelProps = { onContinueToInvalid: () => void }
export function UnrecoverableSessionPanel({ onContinueToInvalid }: UnrecoverableSessionPanelProps) {
  return <Card className="flex flex-col gap-4">
    <h2 className="m-0 text-lg font-bold">Original records unavailable</h2>
    <Notice tone="warn">The original device is permanently lost or broken and its unsynced records cannot be recovered.</Notice>
    <p className="m-0 text-sm text-fg2">This session must be declared invalid. It will contribute no official game history, wins, losses, performance or result slides. An invalid session stays invalid, even if the original device reconnects later.</p>
    <p className="m-0 text-sm text-fg2">Remembered scores cannot replace the original records. Manual reconstruction is not available.</p>
    <Button variant="primary" onClick={onContinueToInvalid}>Continue to invalid session</Button>
  </Card>
}
