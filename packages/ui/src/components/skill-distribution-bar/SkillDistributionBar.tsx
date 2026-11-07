import { cn } from '@rotra/ui/cn'

export type SkillDistributionCounts = {
  beginner: number
  intermediate: number
  advanced: number
  /** Players with no level yet */
  unrated?: number
}

export type SkillDistributionBarProps = {
  counts: SkillDistributionCounts
  /** Heading on the left of the header row */
  label?: string
  className?: string
}

const SEGMENTS = [
  { key: 'beginner', label: 'Beginner', tone: 'bg-accent/30' },
  { key: 'intermediate', label: 'Intermediate', tone: 'bg-accent/60' },
  { key: 'advanced', label: 'Advanced', tone: 'bg-accent' },
  { key: 'unrated', label: 'No level', tone: 'bg-border-strong' },
] as const

/**
 * One stacked bar of how many players sit in each skill group, with a visible legend. Takes counts
 * only, never player data, so the public page can reuse it with aggregate numbers.
 */
export function SkillDistributionBar({
  counts,
  label = 'Skill mix',
  className,
}: SkillDistributionBarProps) {
  const items = SEGMENTS.map((s) => ({ ...s, count: counts[s.key] ?? 0 })).filter(
    (s) => s.count > 0,
  )
  const total = items.reduce((sum, s) => sum + s.count, 0)
  const spoken = items
    .map((s) => (s.key === 'unrated' ? `${s.count} with no level` : `${s.count} ${s.label}`))
    .join(', ')

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-semibold text-fg">{label}</span>
        <span className="text-fg2">
          {total ? `${total} ${total === 1 ? 'player' : 'players'}` : 'No players yet'}
        </span>
      </div>
      {total ? (
        <>
          <div
            role="img"
            aria-label={`${label}: ${spoken}`}
            className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
          >
            {items.map((s) => (
              <span
                key={s.key}
                className={cn('h-full min-w-0 first:rounded-l-full last:rounded-r-full', s.tone)}
                style={{ flexGrow: s.count, flexBasis: 0 }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg2">
            {items.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn('size-2 rounded-full', s.tone)} />
                {s.label} {s.count}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div aria-hidden className="h-2 w-full rounded-full bg-border" />
      )}
    </div>
  )
}
