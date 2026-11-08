import { cn } from '@rotra/ui/cn'
import type { CSSProperties } from 'react'
import type { SkillMixSegmentData } from './skillMix'

export type SkillMixSegmentProps = {
  segment: SkillMixSegmentData
  /** Makes the segment a button (SlotMeter's pressable segments); otherwise it is a focusable image */
  onClick?: () => void
  /** Pressable segments only: whether this level is the one showing */
  pressed?: boolean
  /** Spoken label when it should say more than the tip */
  ariaLabel?: string
  className?: string
  style?: CSSProperties
}

const BASE =
  'group/seg relative block h-full min-w-1 basis-0 border-0 p-0 outline-offset-2 first:rounded-l-full last:rounded-r-full'

/**
 * One colored segment with a hover and focus tooltip ("Beginner: 4 players"). Sized by head count via
 * flex-grow, so put it in a flex row. The label is spoken too, so color and hover are never the only signal.
 */
export function SkillMixSegment({
  segment,
  onClick,
  pressed,
  ariaLabel,
  className,
  style,
}: SkillMixSegmentProps) {
  const tooltip = (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-overlay px-2 py-1 text-xs font-semibold text-fg opacity-0 shadow-pop transition-opacity group-hover/seg:opacity-100 group-focus-visible/seg:opacity-100"
    >
      {segment.tip}
    </span>
  )
  const cls = cn(BASE, segment.tone, onClick && 'cursor-pointer', className)
  const merged = { flexGrow: segment.count, ...style }
  return onClick ? (
    <button
      type="button"
      className={cls}
      style={merged}
      aria-label={ariaLabel ?? segment.tip}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {tooltip}
    </button>
  ) : (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so keyboard users can read the count
    <span role="img" tabIndex={0} className={cls} style={merged} aria-label={segment.tip}>
      {tooltip}
    </span>
  )
}
