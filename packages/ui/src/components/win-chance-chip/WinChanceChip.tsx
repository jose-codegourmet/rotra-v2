import type { WinChance } from '@rotra/data/match/win-chance'
import { Chip, type ChipProps } from '@rotra/ui/chip'
import { chipVariants } from '@rotra/ui/chip/variants'
import { cn } from '@rotra/ui/cn'
import type { ComponentProps } from 'react'

export type WinChanceChipProps = Omit<ChipProps, 'tone' | 'children' | 'title'> & {
  chance: WinChance
  /**
   * Opens the explanation dialog (WinChanceDialog). The chip is then a button that looks the same;
   * its click and key presses never reach a parent tile or court button.
   */
  onOpen?: () => void
  /**
   * One pair's own percent ("61%"), for the chip beside that pair on a queue or draft tile. Omit
   * for both in one chip, left pair first ("39% · 61%"): court cards.
   */
  team?: 'A' | 'B'
  /** Both teams' names for the tooltip: "Win chance · Pau and Ysa 39% · Marco and Iya 61%" */
  teamNames?: { a: string; b: string }
}

/** The tooltip and the both-pairs text, shared with the finished match's corner pill. */
export const winChanceText = (chance: WinChance) => `${chance.a}% · ${chance.b}%`
export const winChanceTitle = (chance: WinChance, names?: { a: string; b: string }) =>
  `Win chance · ${names ? `${names.a} ` : ''}${chance.a}% · ${names ? `${names.b} ` : ''}${chance.b}%`

/**
 * Win chance (the prototype's .chip.wc, wcPair and wcChip): each pair's chance to win, Queue Master
 * only. The stronger pair reads brighter; a Favored pair (65% or more) takes the accent.
 */
export function WinChanceChip({
  chance,
  team,
  teamNames,
  onOpen,
  className,
  ...props
}: WinChanceChipProps) {
  const lead = team ? chance.favored === team : chance.favored !== null
  const accent = lead && chance.strong
  const percent = team === 'A' ? chance.a : chance.b
  const title = winChanceTitle(chance, teamNames)
  const label = team ? `Win chance ${percent}%${accent ? ', favored' : ''}` : title
  const tone = accent ? 'accent' : 'neutral'
  const classes = cn(
    'flex-none self-center px-[7px] py-px text-[11px] tabular-nums',
    team && lead && !accent && 'text-fg',
    className,
  )
  const text = team ? `${percent}%` : winChanceText(chance)
  if (onOpen) {
    const { onClick, onKeyDown, ...rest } = props as ComponentProps<'span'>
    return (
      <button
        type="button"
        title={title}
        aria-label={`${label}. Explain`}
        aria-haspopup="dialog"
        {...(rest as ComponentProps<'button'>)}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(e as never)
          onOpen()
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          onKeyDown?.(e as never)
        }}
        className={cn(
          chipVariants({ tone }),
          classes,
          'relative cursor-pointer bg-transparent hover:border-accent',
          accent && 'bg-accent-subtle',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'touch:before:absolute touch:before:-inset-2 touch:before:content-[""]',
        )}
      >
        {text}
      </button>
    )
  }
  return (
    <Chip tone={tone} title={title} aria-label={label} className={classes} {...props}>
      {text}
    </Chip>
  )
}
