import { Notice } from '@rotra/ui/notice'

export type NotRankedNoticeProps = {
  className?: string
}

/**
 * The info notice a session with Record games off shows above its standings: the Leaderboard tab of
 * the live console and the Results pane of the session record. Nothing to act on: the choice was
 * fixed at Start.
 */
export function NotRankedNotice({ className }: NotRankedNoticeProps) {
  return (
    <Notice title="This session isn't ranked." className={className}>
      Its games and results are recorded as usual, but its wins don't count toward the ROTRA
      leaderboards or anyone's win rate.
    </Notice>
  )
}
