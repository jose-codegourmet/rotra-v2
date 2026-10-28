'use client'

import { cn } from '@rotra/ui/cn'
import { Switch as SwitchPrimitive } from 'radix-ui'
import type { Ref } from 'react'

export type SwitchProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLButtonElement>
  disabled?: boolean
  /** Set while a change is saving */
  'aria-busy'?: boolean
  /** Required: switches sit beside text, so the name must say what it turns on ("Present") */
  'aria-label': string
  id?: string
  className?: string
}

/**
 * The prototypes' .switch (presence, formats, settings). 46 × 28 px, 54 × 32 px on touch screens as
 * the experience contract sets for the Present switch.
 */
export function Switch({ checked, onChange, className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      {...props}
      className={cn(
        'group relative h-7 w-[46px] flex-none cursor-pointer rounded-full border-0 bg-overlay transition-colors duration-150',
        'data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-45',
        'touch:h-8 touch:w-[54px] motion-reduce:transition-none',
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'absolute top-[3px] left-[3px] block size-[22px] rounded-full bg-knob shadow-card transition-transform duration-150',
          'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-on-accent',
          'touch:size-[26px] touch:data-[state=checked]:translate-x-[22px] motion-reduce:transition-none',
        )}
      />
    </SwitchPrimitive.Root>
  )
}
