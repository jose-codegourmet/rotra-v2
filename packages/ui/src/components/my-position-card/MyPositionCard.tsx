import { Avatar, type AvatarProps } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip, type ChipProps } from '@rotra/ui/chip'
import { leaderboardMovement } from '@rotra/ui/leaderboard-move'
import {
  LEADERBOARD_PERIOD_COPY,
  type LeaderboardPeriod,
  leaderboardWinsLabel,
} from '@rotra/ui/leaderboard-period-switch'

export type MyPositionCardProps = {
  fullName: string
  picture?: Pick<AvatarProps, 'src' | 'initials'>
  levelLabel?: string
  position?: number
  period?: LeaderboardPeriod
  wins?: number
  previousPosition?: number | null
  /** Wins of the player in place 50, used when the viewer is below the top 50. */
  cutoffWins?: number
  /** Whether place 50 has a higher win rate when the wins are tied. */
  cutoffHasBetterWinRate?: boolean
  status?: {
    label: string
    tone: NonNullable<ChipProps['tone']>
    sentence: string
    needsReassessment?: boolean
  }
  onShowMyRow?: () => void
  /** Opens the full photo (PhotoViewer, #716); only a real picture is a button */
  onViewPicture?: () => void
  onOpenProfile: () => void
}
export function MyPositionCard({
  fullName,
  picture,
  levelLabel,
  position,
  period,
  wins,
  previousPosition,
  cutoffWins,
  cutoffHasBetterWinRate,
  status,
  onShowMyRow,
  onViewPicture,
  onOpenProfile,
}: MyPositionCardProps) {
  const when = period === undefined ? undefined : LEADERBOARD_PERIOD_COPY[period].current
  const detail =
    period === undefined ? levelLabel : wins === undefined ? undefined : leaderboardWinsLabel(wins)
  const portrait = (
    <Avatar
      name={fullName}
      src={picture?.src}
      initials={picture?.initials}
      onView={onViewPicture}
    />
  )
  if (position !== undefined && detail) {
    const movement =
      period !== undefined && previousPosition !== undefined
        ? leaderboardMovement(period, position, previousPosition)
        : undefined
    return (
      <Card tone="highlight" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {portrait}
          <div>
            <p className="text-[13px] text-fg2">Your position{when ? ` ${when}` : ''}</p>
            <p>
              <b className="font-mono text-xl">#{position.toLocaleString('en-PH')}</b> · {detail}
            </p>
            {movement ? <p className="text-[13px] text-fg2">{movement.sentence}</p> : null}
          </div>
        </div>
        <Button size="sm" className="shrink-0" onClick={onShowMyRow}>
          Show my row
        </Button>
      </Card>
    )
  }
  if (when && wins !== undefined && cutoffWins !== undefined) {
    return (
      <Card className="flex items-center gap-3">
        {portrait}
        <div>
          <h3>You&apos;re not in the top 50 {when}</h3>
          <p className="text-[13px] text-fg2">
            {leaderboardWinsLabel(wins)} {when}. The player in place 50 has{' '}
            {cutoffWins.toLocaleString('en-PH')}
            {wins === cutoffWins && cutoffHasBetterWinRate ? ' and a better win rate' : ''}.
          </p>
        </div>
      </Card>
    )
  }
  if (when) {
    return (
      <Card className="flex flex-col items-start gap-2">
        <h3>You&apos;re not on the leaderboard {when}</h3>
        <p className="text-[13px] text-fg2">You haven&apos;t played a standard match {when} yet.</p>
        <Button size="xs" onClick={onOpenProfile}>
          Open my profile
        </Button>
      </Card>
    )
  }
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3>
          You&apos;re not on the leaderboard{status?.needsReassessment ? ' right now' : ' yet'}
        </h3>
        {status ? <Chip tone={status.tone}>{status.label}</Chip> : null}
      </div>
      {status ? <p className="m-0 text-fg2">{status.sentence}</p> : null}
      <Button size="xs" onClick={onOpenProfile}>
        Open my profile
      </Button>
    </Card>
  )
}
