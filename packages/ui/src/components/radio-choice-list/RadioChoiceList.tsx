'use client'

import { cn } from '@rotra/ui/cn'
import { RadioGroup } from 'radix-ui'
import type { ReactNode } from 'react'

export type RadioChoice = {
  value: string
  /** Bold line: the choice's name */
  title: ReactNode
  /** Muted helper line under the title */
  description?: ReactNode
}

export type RadioChoiceListProps = {
  choices: RadioChoice[]
  value: string
  onChange: (value: string) => void
  /** Names the group, e.g. "Profile visibility" */
  'aria-label': string
  /** Saving or offline: every choice is disabled */
  disabled?: boolean
  /** Set while a change is saving */
  'aria-busy'?: boolean
  className?: string
}

/**
 * The Player prototype's settings .choices: full-width rows, one per choice, each with a radio dot,
 * a bold title and a muted helper line. Exactly one is chosen; arrow keys move between them. Use
 * ChoiceGroup for the Queue option cards.
 */
export function RadioChoiceList({
  choices,
  value,
  onChange,
  disabled,
  className,
  ...aria
}: RadioChoiceListProps) {
  return (
    <RadioGroup.Root
      aria-label={aria['aria-label']}
      aria-busy={aria['aria-busy'] || undefined}
      value={value}
      onValueChange={(next) => {
        if (next && next !== value) onChange(next)
      }}
      disabled={disabled}
      className={cn('flex flex-col gap-2', className)}
    >
      {choices.map((choice) => (
        <RadioGroup.Item
          key={choice.value}
          value={choice.value}
          className={cn(
            'group flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-lg border border-border-strong bg-bg p-3 text-left text-fg',
            'data-[state=checked]:border-accent data-[state=checked]:bg-accent-subtle',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            'disabled:cursor-default disabled:opacity-60',
          )}
        >
          <span
            aria-hidden
            className="mt-0.5 size-[18px] flex-none rounded-full border-2 border-border-strong group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent group-data-[state=checked]:shadow-[inset_0_0_0_3px_var(--bg)]"
          />
          <span className="flex min-w-0 flex-col gap-1">
            <b className="font-bold">{choice.title}</b>
            {choice.description ? (
              <span className="text-sm text-fg2">{choice.description}</span>
            ) : null}
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
