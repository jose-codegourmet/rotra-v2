'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import type { Ref } from 'react'

export type CountStepperProps = {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  /** e.g. "Fewer players per court" */
  decrementLabel: string
  /** e.g. "More players per court" */
  incrementLabel: string
  disabled?: boolean
  /** Ref to the decrement button, so React Hook Form can focus the stepper on error */
  ref?: Ref<HTMLButtonElement>
  /** 20 px in settings, 22 px in session setup */
  size?: 'md' | 'lg'
  className?: string
}

/** The prototypes' − count + stepper (players per court, number of sessions). */
export function CountStepper({
  value,
  min,
  max,
  onChange,
  decrementLabel,
  incrementLabel,
  disabled,
  ref,
  size = 'md',
  className,
}: CountStepperProps) {
  return (
    <div className={cn('flex flex-nowrap items-center gap-2', className)}>
      <Button
        ref={ref}
        size="sm"
        aria-label={decrementLabel}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="min-w-9 px-0 touch:min-w-11 touch:px-0"
      >
        −
      </Button>
      <b
        aria-live="polite"
        className={cn(
          'min-w-7 text-center tabular-nums',
          size === 'lg' ? 'text-[22px]' : 'text-xl',
        )}
      >
        {value}
      </b>
      <Button
        size="sm"
        aria-label={incrementLabel}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="min-w-9 px-0 touch:min-w-11 touch:px-0"
      >
        +
      </Button>
    </div>
  )
}
