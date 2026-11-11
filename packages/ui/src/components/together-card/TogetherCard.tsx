import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import type { CompareIdentity } from '@rotra/ui/compare-stats'
import { levelLabel } from '@rotra/ui/level-pill'
import { ProgressBar } from '@rotra/ui/progress-bar'
import { ValueTiles } from '@rotra/ui/value-tiles'

export type TogetherCardProps = {
  me: CompareIdentity & { level: PlayingLevel | null }
  them: CompareIdentity & { level: PlayingLevel | null }
  games: number
  won: number
  winRate: number | null
  className?: string
}

/** Same-team results share one record, so P-COMPARE uses a team card. */
export function TogetherCard({ me, them, games, won, winRate, className }: TogetherCardProps) {
  const firstName = them.label ?? them.name.split(/\s+/)[0] ?? them.name
  return (
    <Card asChild className={cn('flex flex-col gap-3', className)}>
      <section aria-label="As a team">
        <div className="flex items-center gap-3.5">
          <span className="flex shrink-0 [&>span]:ring-[3px] [&>span]:ring-surface [&>span+span]:-ml-3.5">
            <Avatar
              name={me.name}
              src={me.pictureUrl ?? undefined}
              size={64}
              onView={me.onViewPicture}
            />
            <Avatar
              name={them.name}
              src={them.pictureUrl ?? undefined}
              size={64}
              onView={them.onViewPicture}
            />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <b className="[overflow-wrap:anywhere]">You and {firstName}</b>
            <span className="text-[13px] text-fg2">As a team</span>
          </div>
        </div>
        {games > 0 ? (
          <>
            <ValueTiles
              tiles={[
                { id: 'games', label: 'Games', value: String(games) },
                { id: 'won', label: 'Won', value: String(won) },
                { id: 'lost', label: 'Lost', value: String(games - won) },
              ]}
              className="grid-cols-3 [&>div]:items-center [&>div]:rounded-lg [&>div]:border-0 [&>div]:bg-elev [&>div]:px-1.5 [&>div]:py-3 [&>div>span:first-child]:order-2 [&>div>span:first-child]:text-[13px] [&>div>span:first-child]:font-normal [&>div>span:first-child]:tracking-normal [&>div>span:first-child]:normal-case [&>div>b]:text-[26px] [&>div>b]:leading-[1.1] [&>div>b]:tabular-nums [&>div:nth-child(2)>b]:text-accent"
            />
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-fg2">Win rate as a team</span>
              <b className="text-[22px] tabular-nums">{winRate == null ? '—' : `${winRate}%`}</b>
            </div>
            <ProgressBar
              value={won}
              max={games}
              aria-label={`Won ${won} of ${games} games together`}
              className="h-3 rounded-full bg-border-strong [&>i]:rounded-l-full [&>i]:rounded-r-none [&>i]:border-r-2 [&>i]:border-surface"
            />
            <p className="text-[13px] text-fg2">
              Your level together: {levelLabel(me.level)} and {levelLabel(them.level)}.
            </p>
          </>
        ) : (
          <p className="text-fg2">You haven't played on the same team as {firstName} yet.</p>
        )}
      </section>
    </Card>
  )
}
