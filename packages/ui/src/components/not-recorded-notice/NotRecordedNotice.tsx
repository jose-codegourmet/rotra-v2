import { Notice } from '@rotra/ui/notice'

export type NotRecordedNoticeVariant = 'results' | 'night'

export type NotRecordedNoticeProps = {
  /**
   * results: the Results pane of an unrecorded session record.
   * night: the How the night ran pane, which adds that there is no match history or replay.
   */
  variant?: NotRecordedNoticeVariant
  className?: string
}

/**
 * The info notice a session with Record games off shows in its record instead of standings, result
 * slides, match history or replay. Nothing to act on: the choice was fixed at Start.
 */
export function NotRecordedNotice({ variant = 'results', className }: NotRecordedNoticeProps) {
  return (
    <Notice title="This session's games were not recorded." className={className}>
      It has no results, standings, result slides or awards, and it doesn't count toward player
      records or rankings.
      {variant === 'night' ? ' There is no match history or replay.' : null}
    </Notice>
  )
}
