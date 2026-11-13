import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { type ProfileRankHead, RankActions, RankLabel } from '@rotra/ui/eligibility-card'

export type ProfileRankingCardProps = ProfileRankHead & {
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

/**
 * Leaderboard ranking (P-ELIGIBILITY once the player qualifies; 2026-11-13-player-ranking-card,
 * pass 3): a compact card about this player only. Head: “Leaderboard ranking” and the Qualifies
 * chip. Left: “Shared rank”, the rank label and its status chip. Right: a small box with “Overall”,
 * “#N” (accent, 30 px mono) and “of M”, a button that opens the leaderboard at their row. Footer:
 * “X of T standard matches · last three months” with Share (own) and How this rank works.
 */
export function ProfileRankingCard({
  levelLabel,
  status,
  onShare,
  onOpenRankDetail,
  position,
  total,
  recentCount,
  matchRequirement,
  onOpenLeaderboard,
}: ProfileRankingCardProps) {
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
