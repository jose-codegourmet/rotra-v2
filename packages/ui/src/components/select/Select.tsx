'use client'

import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import { Icon } from '@rotra/ui/icon'
import { Select as SelectPrimitive } from 'radix-ui'
import type { Ref } from 'react'

export type SelectOption = { value: string; label: string; disabled?: boolean }
export type SelectOptionGroup = { label: string; options: SelectOption[] }

export type SelectProps = {
  /** Flat options, or groups (e.g. playing levels grouped by Beginner / Intermediate / Advanced) */
  options: SelectOption[] | SelectOptionGroup[]
  /** Selected value; '' or undefined shows the placeholder */
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLButtonElement>
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** Needed only outside a Field */
  'aria-label'?: string
  className?: string
}

const isGrouped = (o: SelectProps['options']): o is SelectOptionGroup[] =>
  o.length > 0 && 'options' in (o[0] as object)

function Item({ option }: { option: SelectOption }) {
  return (
    <SelectPrimitive.Item
      value={option.value}
      disabled={option.disabled}
      className={cn(
        'relative flex min-h-10 cursor-pointer items-center gap-2 rounded-md py-2 pr-3 pl-8 text-[15px] outline-none select-none',
        'data-highlighted:bg-elev data-disabled:cursor-not-allowed data-disabled:opacity-45',
        'data-[state=checked]:font-semibold touch:min-h-12',
      )}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex text-accent">
        <Icon name="check" size={14} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

/**
 * A dropdown choice (Radix Select restyled to the prototypes' .input). Reports the chosen value
 * through onChange(value), so React Hook Form's field.onChange can be passed straight in.
 */
export function Select({
  options,
  value,
  onChange,
  onBlur,
  name,
  ref,
  placeholder = 'Choose…',
  disabled,
  invalid,
  className,
  ...aria
}: SelectProps) {
  const field = useFieldControl()
  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={onChange}
      onOpenChange={(open) => {
        if (!open) onBlur?.()
      }}
      name={name}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        ref={ref}
        {...field}
        aria-label={aria['aria-label']}
        className={cn(
          inputVariants({ invalid }),
          'flex items-center justify-between gap-2 text-left data-placeholder:text-fg3',
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className="inline-flex flex-none text-fg2">
          <Icon name="down" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden',
            'rounded-lg border border-border-strong bg-surface text-fg shadow-pop',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {isGrouped(options)
              ? options.map((group) => (
                  <SelectPrimitive.Group key={group.label}>
                    <SelectPrimitive.Label className="px-3 pt-2 pb-1 text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
                      {group.label}
                    </SelectPrimitive.Label>
                    {group.options.map((option) => (
                      <Item key={option.value} option={option} />
                    ))}
                  </SelectPrimitive.Group>
                ))
              : options.map((option) => <Item key={option.value} option={option} />)}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
