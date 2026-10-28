import { Notice } from '@rotra/ui/notice'

export type DeviceContinueNoticeProps = { sessionTitle: string; snapshotAt: number | null }
export function DeviceContinueNotice({ sessionTitle, snapshotAt }: DeviceContinueNoticeProps) {
  const time = snapshotAt === null ? 'not available' : new Date(snapshotAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
  return <Notice tone="warn" title={`Continuing ${sessionTitle} on this device.`}>Latest snapshot on this device: {time}. Changes from the original device may still be missing; presence and the queue may be stale. You can record new matches on this device. Session done waits for the original records.</Notice>
}
