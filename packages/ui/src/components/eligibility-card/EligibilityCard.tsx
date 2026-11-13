import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { ProgressBar } from '@rotra/ui/progress-bar'

/** The shared rank's status chip (rankStatus): Not calculated, Needs reassessment, On the leaderboard, … */
export type RankStatusChip = { label: string; tone: 'accent' | 'warn' | 'neutral' }

/**
 * The shared rank, shown in the head of the eligibility and Leaderboard ranking cards since the
 * separate Shared rank card left the profile (2026-11-13-player-ranking-card, pass 2).
 */
export type ProfileRankHead = {
  /** The level label; null shows “No rank yet” in muted text */
  levelLabel: string | null
  status: RankStatusChip
  /** Own profile with a rank: Share (the Share rank sheet) */
  onShare?: () => void
  /** How this rank works: the rank page (ladder and the full explanation) */
  onOpenRankDetail: () => void
}

/** “Shared rank”, then the rank label (bold, 20 px; muted when not ranked) with its status chip. */
export function RankLabel({ levelLabel, status }: Pick<ProfileRankHead, 'levelLabel' | 'status'>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Shared rank</span>
      <div className="flex flex-wrap items-center gap-2">
        <b className={cn('text-[20px] font-extrabold', !levelLabel && 'text-fg2')}>
          {levelLabel ?? 'No rank yet'}
        </b>
        <Chip tone={status.tone}>{status.label}</Chip>
      </div>
    </div>
  )
}

/** Share (own, ranked) and How this rank works. */
export function RankActions({
  onShare,
  onOpenRankDetail,
}: Pick<ProfileRankHead, 'onShare' | 'onOpenRankDetail'>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {onShare ? (
        <Button size="xs" onClick={onShare}>
          <Icon name="share" size={14} /> Share
        </Button>
      ) : null}
      <Button size="xs" variant="ghost" onClick={onOpenRankDetail}>
        How this rank works
      </Button>
    </div>
  )
}

/**
 * Leaderboard eligibility (P-ELIGIBILITY): for a player who doesn't qualify yet (or needs
 * reassessment). With `rank`, its head carries the shared rank (label, status chip, Share, How this
 * rank works) and `rankText` (the rank status line); then the count of standard matches, the
 * progress bar and the rules. A player who qualifies and has a position gets ProfileRankingCard.
 */
export function EligibilityCard({
  recentCount,
  matchRequirement,
  needsReassessment = false,
  sentence,
  rank,
  rankText,
}: {
  recentCount: number
  matchRequirement: number
  needsReassessment?: boolean
  sentence?: string
  /** The shared rank in the card's head (the profile) */
  rank?: ProfileRankHead
  /** The rank status line under the head, e.g. the reassessment note */
  rankText?: string
}) {
  const qualifies = recentCount >= matchRequirement && !needsReassessment
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex justify-between gap-2">
        <h2>Leaderboard eligibility</h2>
        <Chip tone={qualifies ? 'accent' : needsReassessment ? 'warn' : 'neutral'}>
          {qualifies ? 'Qualifies' : 'Not yet'}
        </Chip>
      </div>
      {rank ? (
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b border-border pb-3">
          <RankLabel levelLabel={rank.levelLabel} status={rank.status} />
          <RankActions onShare={rank.onShare} onOpenRankDetail={rank.onOpenRankDetail} />
        </div>
      ) : null}
      {rankText ? <p className="m-0 text-[13px] text-fg2">{rankText}</p> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-mono text-[22px] font-semibold">
          {recentCount} <span className="text-[15px] text-fg2">of {matchRequirement}</span>
        </span>
        <span className="text-[13px] text-fg2">standard matches · last three months</span>
      </div>
      <ProgressBar
        value={recentCount}
        max={matchRequirement}
        tone={needsReassessment ? 'warn' : 'accent'}
        aria-label="Standard matches in the last three months"
      />
      {sentence ? <p className="m-0 text-[13px] text-fg2">{sentence}</p> : null}
      <p className="m-0 text-[13px] text-fg2">
        Fun games, partial games after a substitution, and invalid games or sessions don&apos;t
        count.
      </p>
    </Card>
  )
}
