import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { ListRow } from '@rotra/ui/list-row'
import { useId, useRef } from 'react'

export type DownloadedSession = {
  sessionId: string
  title: string
  startsAt: number
}

export type ThisDevicePanelProps = {
  /** Sessions with a ready offline copy on this device */
  downloaded: DownloadedSession[]
  /** Export play history: downloads `playhistory.json`; the button is disabled with no downloads */
  onExport?: () => void
  /** Import play history…: the chosen `.json` file */
  onImport?: (file: File) => void
  /** An export or import is running */
  isPending?: boolean
  className?: string
}

const formatDate = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * Club settings › This device: the sessions downloaded here, or how to get one, then Export play
 * history and Import play history… with the backup note (D-2026-11-11-04). Works offline.
 */
export function ThisDevicePanel({
  downloaded,
  onExport,
  onImport,
  isPending = false,
  className,
}: ThisDevicePanelProps) {
  const id = useId()
  const fileInput = useRef<HTMLInputElement>(null)
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!downloaded.length || isPending} onClick={onExport}>
            Export play history
          </Button>
          <Button size="sm" disabled={isPending} onClick={() => fileInput.current?.click()}>
            Import play history…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import play history"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) onImport?.(file)
            }}
          />
        </div>
        <p className="m-0 text-[13px] text-fg2">
          Changes made offline are saved on this device automatically. The file is a backup for
          moving a session to another device or recovering one that broke.
        </p>
      </section>
    </Card>
  )
}
