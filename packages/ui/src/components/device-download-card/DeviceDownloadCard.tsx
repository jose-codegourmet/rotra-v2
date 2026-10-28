import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { Notice } from '@rotra/ui/notice'

export type DeviceDownloadState = 'none' | 'downloading' | 'ready'

export type DeviceDownloadCardProps = {
  state: DeviceDownloadState
  onDownload: () => void
  offline?: boolean
  /** A previous usable copy survives a failed update: "Copy from 7:42 PM" */
  snapshotAge?: string
  error?: string
  className?: string
}

const CHIP = {
  none: { tone: 'neutral', label: 'Not downloaded on this device' },
  downloading: { tone: 'warn', label: 'Downloading…' },
  ready: { tone: 'accent', label: 'Ready on this device' },
} as const

/** Preparation › Overview › This device: the download chip, why it matters, and the download button. */
export function DeviceDownloadCard({
  state,
  onDownload,
  offline,
  snapshotAge,
  error,
  className,
}: DeviceDownloadCardProps) {
  const chip = CHIP[state]
  return (
    <Card asChild className={className}>
      <section aria-label="This device" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>This device</h2>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
        <p className="m-0 text-[13px] text-fg2">
          Download the session so this device can keep running it if the venue's internet drops. A
          download on one device doesn't prepare any other device.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onDownload}
            disabled={offline || state === 'downloading'}
            loading={state === 'downloading'}
          >
            {state === 'ready' ? 'Update download' : 'Download for offline use'}
          </Button>
        </div>
        {offline ? (
          <p className="m-0 text-[13px] text-fg2">Downloading needs an internet connection.</p>
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {snapshotAge ? (
          <p className="m-0 text-[13px] text-fg2">Previous copy kept: {snapshotAge}</p>
        ) : null}
      </section>
    </Card>
  )
}
