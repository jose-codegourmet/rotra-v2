import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { type ProfileRankHead, RankActions, RankLabel } from '@rotra/ui/eligibility-card'
import {
  LEADERBOARD_PERIOD_COPY,
  type LeaderboardPeriod,
  leaderboardWinsLabel,
} from '@rotra/ui/leaderboard-period-switch'

export type ProfileLeaderboardPlace = {
  period: LeaderboardPeriod
  position: number
  wins: number
}

type ProfileLeaderboardProps = {
  leaderboardPlaces: readonly ProfileLeaderboardPlace[]
  rankText?: string
  onOpenLeaderboard: (period: LeaderboardPeriod) => void
}

type OverallRankingProps = {
  /** Overall leaderboard position */
  position: number
  /** Ranked players on the overall leaderboard (“of M”); hidden while unknown */
  total?: number | null
  /** Standard matches in the last three months */
  recentCount: number
  matchRequirement: number
  /** The Overall box: opens the leaderboard at this player's row (it flashes) */
  onOpenLeaderboard: () => void
}

export type ProfileRankingCardProps = ProfileRankHead &
  (ProfileLeaderboardProps | OverallRankingProps)

export function ProfileRankingCard(props: ProfileRankingCardProps) {
  const { levelLabel, status, onShare, onOpenRankDetail } = props
  if ('leaderboardPlaces' in props) {
    const { leaderboardPlaces, rankText, onOpenLeaderboard } = props
    return (
      <Card asChild>
        <section className="flex flex-col gap-3">
          {leaderboardPlaces.length ? <h2>Leaderboards</h2> : null}
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b border-border pb-3">
            <RankLabel levelLabel={levelLabel} status={status} />
            <RankActions onShare={onShare} onOpenRankDetail={onOpenRankDetail} />
          </div>
          {rankText ? <p className="text-[13px] text-fg2">{rankText}</p> : null}
          {leaderboardPlaces.length ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {leaderboardPlaces.map(({ period, position, wins }) => {
                const { label, current } = LEADERBOARD_PERIOD_COPY[period]
                const formattedPosition = position.toLocaleString('en-PH')
                const winsLabel = leaderboardWinsLabel(wins)
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => onOpenLeaderboard(period)}
                    aria-label={`${label}: number ${formattedPosition}, ${winsLabel}. See on the leaderboard`}
                    className="flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border border-border bg-bg px-3 py-2.5 text-left text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
                      {label}
                    </span>
                    <b className="font-mono text-[28px] leading-[1.1] font-semibold text-accent tabular-nums">
                      #{formattedPosition}
                    </b>
                    <span className="text-[13px] text-fg2">
                      {winsLabel} {current}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>
      </Card>
    )
  }

  const { position, total, recentCount, matchRequirement, onOpenLeaderboard } = props
  const n = position.toLocaleString('en-PH')
  const of = total ? total.toLocaleString('en-PH') : null
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <div className="flex justify-between gap-2">
          <h2>Leaderboard ranking</h2>
          <Chip tone="accent">Qualifies</Chip>
        </div>
        <div className="flex items-stretch justify-between gap-3">
          <div className="flex min-w-0 flex-col justify-center">
            <RankLabel levelLabel={levelLabel} status={status} />
          </div>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            aria-label={`Overall number ${n}${of ? ` of ${of}` : ''}. See on the leaderboard`}
            className="flex flex-none cursor-pointer flex-col items-end justify-center rounded-lg border border-border bg-bg px-3 py-1.5 text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">
              Overall
            </span>
            <b className="font-mono text-[30px] leading-none font-semibold text-accent tabular-nums">
              #{n}
            </b>
            {of ? <span className="text-[13px] text-fg2">of {of}</span> : null}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-border pt-2.5">
          <span className="text-[13px] text-fg2">
            {recentCount} of {matchRequirement} standard matches · last three months
          </span>
          <RankActions onShare={onShare} onOpenRankDetail={onOpenRankDetail} />
        </div>
      </section>
    </Card>
  )
}
