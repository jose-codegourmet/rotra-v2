'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
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
  /**
   * Illustration URL (16:9, shown across the top): makes this an art card with a check badge and a
   * glow when picked. The app passes the URL, so this package stays app-agnostic.
   */
  art?: string
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

const artItemClass = cn(
  itemClass,
  'group/art relative gap-0 overflow-hidden p-0 transition-[transform,border-color,box-shadow] duration-150 touch:p-0 motion-reduce:transition-none',
  'hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_50%,var(--border-strong))] motion-reduce:hover:translate-y-0',
  'data-[state=on]:bg-bg data-[state=on]:shadow-[0_0_0_1px_var(--accent),0_8px_24px_color-mix(in_srgb,var(--accent)_18%,transparent)]',
)

function Items({ choices }: { choices: Choice[] }) {
  return choices.map((choice) =>
    choice.art ? (
      <ToggleGroup.Item
        key={choice.value}
        value={choice.value}
        disabled={choice.disabled}
        className={artItemClass}
      >
        <span
          aria-hidden="true"
          style={{ backgroundImage: `url('${choice.art}')` }}
          className="block aspect-video w-full bg-elev bg-cover bg-center bg-no-repeat brightness-[.85] saturate-[.85] transition-[filter] duration-200 group-hover/art:brightness-100 group-hover/art:saturate-100 group-data-[state=on]/art:brightness-100 group-data-[state=on]/art:saturate-100"
        />
        <span className="flex min-w-0 flex-col gap-1 px-3.5 pt-3 pb-3.5">
          <b className="text-base font-bold">{choice.title}</b>
          {choice.description ? (
            <span className="text-[13px] text-fg2">{choice.description}</span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 hidden size-[26px] place-items-center rounded-full bg-accent text-on-accent shadow-[0_2px_8px_rgb(0_0_0/0.4)] group-data-[state=on]/art:grid"
        >
          <Icon name="check" size={14} />
        </span>
      </ToggleGroup.Item>
    ) : (
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
    ),
  )
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
