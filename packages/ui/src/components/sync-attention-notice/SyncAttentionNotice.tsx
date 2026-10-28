'use client'

import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'

export type SyncAttentionNoticeProps = {
  variant: 'retry' | 'not-saved' | 'authorization' | 'incomplete'
  canFinishAndSync?: boolean
  onRetry?: () => void
  retrying?: boolean
}
/** Copy beyond the fixed sync labels follows offline-recovery.md and needs owner review. */
export function SyncAttentionNotice({ variant, canFinishAndSync, onRetry, retrying }: SyncAttentionNoticeProps) {
  if (variant === 'retry') return <Notice tone="warn" title="Sync needs attention." action={onRetry ? <Button size="sm" onClick={onRetry} loading={retrying}>Retry sync</Button> : undefined}>Your local work is kept on this device. Reconnect or retry to sync it.</Notice>
  if (variant === 'not-saved') return <Notice tone="error" title="Changes could not be saved">The last action did not complete. Your earlier changes are kept. Try the action again.</Notice>
  if (variant === 'authorization') return <Notice tone="warn" title="Authorization has expired.">{canFinishAndSync ? 'You can still finish and sync this active session. Your local records are kept.' : 'This session cannot finish or sync until access is restored. Your local records are kept.'}</Notice>
  return <Notice tone="warn" title="Session records are incomplete.">Another device has not synced its original records. Recording new matches can continue; Session done waits for those records.</Notice>
}
