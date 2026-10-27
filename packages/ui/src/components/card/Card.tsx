import { cn } from '@rotra/ui/cn'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { type CardVariants, cardVariants } from './Card.variants'

export type CardProps = ComponentProps<'div'> &
  CardVariants & {
    /** Render as the child element (section, article, a button) with card styles */
    asChild?: boolean
  }

/** The prototypes' .card: surface panel with a border, 10 px radius and the light-mode lift. */
export function Card({ tone, padding, asChild, className, ...props }: CardProps) {
  const Comp = asChild ? Slot.Root : 'div'
  return <Comp className={cn(cardVariants({ tone, padding }), className)} {...props} />
}
