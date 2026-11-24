'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import type { ReactNode } from 'react'

export type TickTileProps = {
  /** The tile's text, e.g. "2 v 2" */
  label: ReactNode
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * The prototype's .fmt-tick: a multi-select tile with a tick box and a label. Ticked = accent box with a
 * check, accent border and a light tint; unticked = grey. A button with role="checkbox".
 */
export function TickTile({ label, checked, onChange, disabled, className }: TickTileProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a tile styled as a whole button; a native checkbox input cannot draw the tile
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-border-strong bg-bg px-3 py-2 text-left font-[inherit] text-fg2 transition-colors',
        'not-aria-checked:hover:border-[color-mix(in_srgb,var(--accent)_50%,var(--border-strong))]',
        'aria-checked:border-accent aria-checked:bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg))] aria-checked:text-fg',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 flex-none place-items-center rounded-[5px] border-2',
          checked ? 'border-accent bg-accent text-on-accent' : 'border-fg3 bg-transparent',
        )}
      >
        {checked ? <Icon name="check" size={13} /> : null}
      </span>
      <b className="text-[15px] font-bold tabular-nums">{label}</b>
    </button>
  )
}
