import { Notice } from '@rotra/ui/notice'

export type InvalidSessionNoticeVariant = 'results' | 'night'

export type InvalidSessionNoticeProps = {
  /**
   * results: the Results pane of an invalid session record (names the reason).
   * night: the How the night ran pane (no match history or replay).
   */
  variant?: InvalidSessionNoticeVariant
  /** Why the session is invalid; shown after the bold lead-in on the results variant */
  reason?: string
  className?: string
}

/**
 * Q-INVALID-SESSION: the error-style notice an invalid session shows in its record instead of
 * standings, result slides or match history. Invalidity is permanent, so there is no action.
 */
export function InvalidSessionNotice({
  variant = 'results',
  reason,
  className,
}: InvalidSessionNoticeProps) {
  if (variant === 'night') {
    return (
      <Notice tone="error" title="This session has no official result," className={className}>
        so there is no match history or replay. Its partial records aren't shown.
      </Notice>
    )
  }
  return (
    <Notice tone="error" title="This session has no official result." className={className}>
      {reason ? `${reason} ` : null}
      It doesn't count toward player records or rankings, and there are no standings or result
      slides. Its partial records aren't shown as match history.
    </Notice>
  )
}
