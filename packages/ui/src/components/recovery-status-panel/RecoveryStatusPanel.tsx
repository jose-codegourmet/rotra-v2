import { Notice } from '@rotra/ui/notice'

export type RecoveryStatusPanelProps = { state: 'waiting' | 'received' }
export function RecoveryStatusPanel({ state }: RecoveryStatusPanelProps) {
  return state === 'waiting' ? <Notice tone="warn" title="Waiting for the original device.">Reconnect the original device so it can upload its records. Session done stays blocked until the required records arrive and conflicts are reviewed.</Notice> : <Notice tone="success" title="Original records received.">The original device's records have arrived. Review any conflicts before Session done.</Notice>
}
