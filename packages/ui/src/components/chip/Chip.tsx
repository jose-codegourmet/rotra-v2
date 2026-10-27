import { cn } from '@rotra/ui/cn'
import type { ComponentProps, ReactNode } from 'react'
import { type ChipVariants, chipVariants } from './Chip.variants'

export type ChipProps = Omit<ComponentProps<'span'>, 'children'> &
  ChipVariants & {
    /** Required: a chip never shows a state by colour alone */
    children: ReactNode
  }

/** A small state label: Registered, Live, Needs attention, Min 4 games. */
export function Chip({ tone, className, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipVariants({ tone }), className)} {...props}>
      {tone === 'live' ? (
        <i
          aria-hidden
          className="size-2 flex-none rounded-full bg-accent animate-[pulse_1.6s_infinite] motion-reduce:animate-none"
        />
      ) : null}
      {children}
    </span>
  )
}
