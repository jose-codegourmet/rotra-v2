import type { LeaderboardPlace } from '@rotra/data/leaderboard/types'
import { Card } from '@rotra/ui/card'
import { type ProfileRankHead, RankActions, RankLabel } from '@rotra/ui/eligibility-card'
import {
  LEADERBOARD_PERIOD_COPY,
  type LeaderboardPeriod,
  leaderboardWinsLabel,
} from '@rotra/ui/leaderboard-period-switch'

export type ProfileRankingCardProps = ProfileRankHead & {
  leaderboardPlaces: readonly LeaderboardPlace[]
  rankText?: string
  onOpenLeaderboard: (period: LeaderboardPeriod) => void
}

export function ProfileRankingCard({
  levelLabel,
  status,
  onShare,
  onOpenRankDetail,
  leaderboardPlaces,
  rankText,
  onOpenLeaderboard,
}: ProfileRankingCardProps) {
  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        {leaderboardPlaces.length ? <h2>Leaderboards</h2> : null}
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b border-border pb-3">
          <RankLabel levelLabel={levelLabel} status={status} />
          <RankActions onShare={onShare} onOpenRankDetail={onOpenRankDetail} />
        </div>
        {rankText ? <p className="m-0 text-[13px] text-fg2">{rankText}</p> : null}
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
