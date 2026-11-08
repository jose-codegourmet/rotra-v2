import { cn } from '@rotra/ui/cn'
import { SkillMixSegment } from './SkillMixSegment'
import { type SkillMixCounts, skillMixSegments } from './skillMix'

export type SkillDistributionCounts = SkillMixCounts

export type SkillDistributionBarProps = {
  counts: SkillDistributionCounts
  /** Small heading above the bar */
  label?: string
  className?: string
}

/**
 * One compact bar of how many players sit in each skill group. No legend and no rows: hover or focus a
 * segment for its count. Takes counts only, never player data, so the public page can reuse it with
 * aggregate numbers.
 */
export function SkillDistributionBar({
  counts,
  label = 'Skill mix',
  className,
}: SkillDistributionBarProps) {
  const segments = skillMixSegments(counts)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-bold text-fg">{label}</span>
        {segments.length ? null : <span className="text-fg2">No players yet</span>}
      </div>
      {segments.length ? (
        // biome-ignore lint/a11y/useSemanticElements: a group of bar segments is not a form fieldset.
        <div role="group" aria-label={label} className="flex h-2.5 w-full gap-0.5">
          {segments.map((s) => (
            <SkillMixSegment key={s.key} segment={s} />
          ))}
        </div>
      ) : (
        <div aria-hidden className="h-2.5 w-full rounded-full bg-border" />
      )}
    </div>
  )
}
