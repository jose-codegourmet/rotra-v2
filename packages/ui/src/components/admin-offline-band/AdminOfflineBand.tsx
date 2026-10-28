import { OfflineBand } from '@rotra/ui/offline-band'

export type AdminOfflineBandProps = { loadedAt: Date }

export function AdminOfflineBand({ loadedAt }: AdminOfflineBandProps) {
  return <OfflineBand audience="admin" savedAt={loadedAt} />
}
