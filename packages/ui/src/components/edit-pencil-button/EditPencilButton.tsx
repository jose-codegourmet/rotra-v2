'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { MouseEventHandler } from 'react'

export type EditPencilButtonProps = {
  /** The player's name: the button reads "Edit NAME" */
  name: string
  onClick: MouseEventHandler<HTMLButtonElement>
  /** Shadow for a pencil that floats over a card's border (the live Players card) */
  floating?: boolean
  className?: string
}

/**
 * Edit player pencil (the prototype's .pc3-edit and .rv-edit): a 28 px accent circle with a
 * pencil. On the live Players card it floats over the top-right corner; on the preparation roster
 * card and row it sits beside the remove ×.
 */
export function EditPencilButton({
  name,
  onClick,
  floating = false,
  className,
}: EditPencilButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Edit ${name}`}
      title="Edit player"
      onClick={onClick}
      className={cn(
        'grid size-7 min-h-0 min-w-7 flex-none cursor-pointer place-items-center rounded-full border-[1.5px] border-accent bg-[color-mix(in_srgb,var(--accent)_16%,var(--elev))] p-0 text-accent transition-[background-color,color,transform] duration-150 hover:scale-[1.08] hover:bg-accent hover:text-on-accent focus-visible:scale-[1.08] focus-visible:bg-accent focus-visible:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none',
        floating && 'shadow-md',
        className,
      )}
    >
      <Icon name="edit" size={14} />
    </button>
  )
}
