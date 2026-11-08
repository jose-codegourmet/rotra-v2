import { cn } from '@rotra/ui/cn'
import { type SkillMixCounts, type SkillMixKey, skillMixSegments } from '@rotra/ui/skill-mix'
import { SkillMixSegment } from '@rotra/ui/skill-mix-segment'
import { slotMeterBarVariants } from './SlotMeter.variants'

export type SlotMeterProps = {
  live?: boolean
  rosterCount: number
  capacity: number
  waitlistCount?: number
  /**
   * Confirmed players by skill group. When given, the bar spans the slot budget as colored player
   * segments plus a grey open-slots remainder, each with a hover and focus tooltip. Without it the
   * plain fill bar shows.
   */
  skillCounts?: SkillMixCounts
  /** Makes each player segment a button. Pressing the active one reports its level again so the parent can clear it. */
  onLevelPress?: (level: SkillMixKey) => void
  /** The pressed level: its segment stays full and the other player segments dim */
  activeLevel?: SkillMixKey | null
  className?: string
}

/** "14/24 slots · 10 left before the waitlist" with a bar; amber near or at the budget. */
export function SlotMeter({
  rosterCount,
  capacity,
  waitlistCount = 0,
  live = false,
  skillCounts,
  onLevelPress,
  activeLevel = null,
  className,
}: SlotMeterProps) {
  const open = capacity - rosterCount
  const state = open < 0 ? 'over' : open === 0 ? 'full' : open <= 2 ? 'near' : 'ok'
  const text = live
    ? `${Math.max(0, -open)} over plan · additional players can be admitted directly`
    : open > 0
      ? `${open} left before the waitlist`
      : open === 0
        ? 'Full · new players go on the waitlist'
        : `${-open} over budget · new players go on the waitlist`
  const warn = state !== 'ok' && state !== 'near'
  if (skillCounts) {
    const segments = skillMixSegments(skillCounts)
    const openLabel = open === 1 ? '1 open slot' : `${open} open slots`
    return (
      <div
        className={cn(
          'flex flex-col gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3',
          className,
        )}
      >
        <div className="flex flex-wrap items-baseline gap-2 text-[13px] text-fg2">
          <b className="text-xl text-fg tabular-nums">
            {rosterCount}/{capacity}
          </b>
          <span className={cn(warn && 'font-semibold text-warn')}>
            slots · {text}
            {waitlistCount ? ` · ${waitlistCount} on the waitlist` : ''}
          </span>
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a group of bar segments is not a form fieldset. */}
        <div
          role="group"
          aria-label={`Slots and skill mix: ${rosterCount} of ${capacity} slots used`}
          className="flex h-3 gap-0.5"
        >
          {segments.map((seg) => (
            <SkillMixSegment
              key={seg.key}
              segment={seg}
              onClick={onLevelPress ? () => onLevelPress(seg.key) : undefined}
              pressed={onLevelPress ? activeLevel === seg.key : undefined}
              ariaLabel={
                onLevelPress
                  ? `${seg.tip}${activeLevel === seg.key ? '. Showing this level; press to show everyone' : '. Press to show only this level'}`
                  : undefined
              }
              className={cn(
                'transition-opacity',
                activeLevel != null && activeLevel !== seg.key && 'opacity-45',
              )}
            />
          ))}
          {open > 0 ? (
            <SkillMixSegment
              segment={{
                key: 'unrated',
                label: 'Open slots',
                count: open,
                widthPct: capacity ? (open / capacity) * 100 : 0,
                tip: openLabel,
                tone: 'bg-elev',
              }}
            />
          ) : null}
          {segments.length === 0 && open <= 0 ? (
            <span aria-hidden className="block h-full flex-1 rounded-full bg-border" />
          ) : null}
        </div>
      </div>
    )
  }
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border border-border bg-bg px-3 py-2.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-2 text-[13px] text-fg2">
        <b className="text-xl text-fg tabular-nums">
          {rosterCount}/{capacity}
        </b>
        <span className={cn(warn && 'font-semibold text-warn')}>
          slots · {text}
          {waitlistCount ? ` · ${waitlistCount} on the waitlist` : ''}
        </span>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot take the prototype's bar styling */}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(rosterCount, capacity)}
        aria-label={`Slots used: ${rosterCount} of ${capacity}`}
        className="h-1.5 overflow-hidden rounded-full bg-elev"
      >
        <i
          className={slotMeterBarVariants({ state })}
          style={{ width: `${Math.min(100, capacity ? (rosterCount / capacity) * 100 : 100)}%` }}
        />
      </div>
    </div>
  )
}
