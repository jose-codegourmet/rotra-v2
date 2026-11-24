import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ComponentProps } from 'react'
import { pickChipClass } from './PickChip.variants'

export type PickChipProps = Omit<ComponentProps<'button'>, 'role'> & {
  /** Picked: accent border and fill, and a check before the label */
  picked?: boolean
  /** Pass "checkbox" for a multi-pick chip. Leave out for an action chip such as + Others. */
  role?: 'checkbox'
}

/** The prototypes' .ob-chip: a pill button that is picked or not. Never shows state by colour alone. */
export function PickChip({ picked, role, className, children, type, ...props }: PickChipProps) {
  return (
    <button
      type={type ?? 'button'}
      role={role}
      aria-checked={role === 'checkbox' ? !!picked : undefined}
      className={cn(pickChipClass, className)}
      {...props}
    >
      {picked ? <Icon name="check" size={14} /> : null}
      {children}
    </button>
  )
}
