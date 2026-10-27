'use client'

import { cn } from '@rotra/ui/cn'
import { ToggleGroup } from 'radix-ui'
import type { ReactNode } from 'react'

export type Choice = {
  value: string
  /** Bold line: the option's name */
  title: ReactNode
  /** Muted line under the title */
  description?: ReactNode
  /** Small uppercase label above the title, e.g. "Team A" */
  eyebrow?: ReactNode
  disabled?: boolean
}

type CommonProps = {
  choices: Choice[]
  /** Names the group, e.g. "Session mode" */
  'aria-label': string
  disabled?: boolean
  className?: string
}

export type ChoiceGroupProps = CommonProps &
  (
    | { type: 'single'; value: string; onChange: (value: string) => void }
    | { type: 'multiple'; value: string[]; onChange: (value: string[]) => void }
  )

const itemClass = cn(
  'flex min-w-0 flex-col gap-1 rounded-lg border border-border-strong bg-bg px-3.5 py-3 text-left',
  'data-[state=on]:border-accent data-[state=on]:bg-accent-subtle',
  'disabled:cursor-not-allowed disabled:opacity-45 touch:px-4 touch:py-3.5',
)

function Items({ choices }: { choices: Choice[] }) {
  return choices.map((choice) => (
    <ToggleGroup.Item
      key={choice.value}
      value={choice.value}
      disabled={choice.disabled}
      className={itemClass}
    >
      {choice.eyebrow ? (
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          {choice.eyebrow}
        </span>
      ) : null}
      <b className="font-bold">{choice.title}</b>
      {choice.description ? (
        <span className="text-[13px] text-fg2">{choice.description}</span>
      ) : null}
    </ToggleGroup.Item>
  ))
}

const rootClass = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2.5'

/**
 * The prototypes' .choices: cards with a title and a description line, picked one at a time (session
 * mode, winner) or several at once (formats). Arrow keys move between cards.
 */
export function ChoiceGroup(props: ChoiceGroupProps) {
  const { choices, disabled, className } = props
  const common = {
    disabled,
    'aria-label': props['aria-label'],
    className: cn(rootClass, className),
  }
  if (props.type === 'multiple') {
    return (
      <ToggleGroup.Root
        type="multiple"
        value={props.value}
        onValueChange={props.onChange}
        {...common}
      >
        <Items choices={choices} />
      </ToggleGroup.Root>
    )
  }
  const { onChange } = props
  return (
    <ToggleGroup.Root
      type="single"
      value={props.value}
      // A single choice stays chosen: a second tap on the same card does not clear it.
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      {...common}
    >
      <Items choices={choices} />
    </ToggleGroup.Root>
  )
}
