import { Icon } from '@rotra/ui/icon'

export type OfflineBandProps = {
  /** Time at which this device last saved the data being shown. */
  savedAt: Date
  /** Admin describes browser-loaded data and its online-only operations. */
  audience?: 'player' | 'admin'
}

function formatSavedAt(savedAt: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(savedAt)
}

/** The Player Information full-width offline status band, immediately below the top bar. */
export function OfflineBand({ savedAt, audience = 'player' }: OfflineBandProps) {
  return (
    <div role="status" className="border-b border-warn bg-warn-subtle text-[13px]">
      <div
        className={
          audience === 'admin'
            ? 'flex items-start gap-2.5 px-4 py-2'
            : 'mx-auto flex max-w-[1240px] items-start gap-2.5 px-4 py-2'
        }
      >
        <Icon name="alert" className="mt-0.5 flex-none text-warn" />
        <p className="m-0">
          <b>You&apos;re offline.</b> Showing what{' '}
          {audience === 'admin' ? 'this browser loaded' : 'this device saved'} at{' '}
          <time dateTime={savedAt.toISOString()}>{formatSavedAt(savedAt)}</time>.{' '}
          {audience === 'admin'
            ? 'Activating licenses, approving requests and saving settings need an internet connection.'
            : 'Signing in and saving changes need an internet connection.'}
        </p>
      </div>
    </div>
  )
}
