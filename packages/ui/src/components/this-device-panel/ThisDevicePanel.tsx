import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { ListRow } from '@rotra/ui/list-row'
import { useId } from 'react'

export type DownloadedSession = {
  sessionId: string
  title: string
  startsAt: number
}

export type ThisDevicePanelProps = {
  /** Sessions with a ready offline copy on this device */
  downloaded: DownloadedSession[]
  className?: string
}

const formatDate = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/** Club settings › This device: the sessions downloaded here, or how to get one. */
export function ThisDevicePanel({ downloaded, className }: ThisDevicePanelProps) {
  const id = useId()
  return (
    <Card asChild className={className}>
      <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <h2 id={`${id}-h`}>This device</h2>
        {downloaded.length ? (
          <div className="divide-y divide-border">
            {downloaded.map((session) => (
              <ListRow
                key={session.sessionId}
                title={session.title}
                subtitle={`${formatDate(session.startsAt)} · ready for offline use`}
                trailing={<Chip tone="accent">Ready</Chip>}
              />
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13px] text-fg2">
            No sessions downloaded on this device yet. Download one from its preparation page.
          </p>
        )}
        <p className="m-0 text-[13px] text-fg2">
          Downloads are per device. A session downloaded on a laptop isn't ready on a phone.
        </p>
      </section>
    </Card>
  )
}
