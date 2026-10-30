import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'

export type ConfigConflictNoticeProps = {
  /** The version now in effect, saved by someone else */
  currentVersion: number
  /** The version the draft was based on */
  baseVersion: number
  /** Keeps the draft and rebases it on currentVersion */
  onRebase: () => void
  /** Drops the draft and starts again from currentVersion */
  onStartOver: () => void
  className?: string
}

/**
 * Ranking settings (A-RANK-CONFIG): the error notice shown when a newer version was saved while the
 * draft was open. Never last-write-wins: the draft is kept until they choose.
 */
export function ConfigConflictNotice({
  currentVersion,
  baseVersion,
  onRebase,
  onStartOver,
  className,
}: ConfigConflictNoticeProps) {
  return (
    <Notice
      tone="error"
      title={`Version ${currentVersion} was saved by someone else while you were editing.`}
      action={
        <>
          <Button size="xs" onClick={onRebase}>
            Use my draft on version {currentVersion}
          </Button>
          <Button size="xs" variant="ghost" onClick={onStartOver}>
            Start over from version {currentVersion}
          </Button>
        </>
      }
      className={className}
    >
      Your draft is kept, but it was based on version {baseVersion}. Compare it with the values now
      in effect, then review again.
    </Notice>
  )
}
