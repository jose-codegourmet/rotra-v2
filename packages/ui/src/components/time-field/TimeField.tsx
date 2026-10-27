'use client'

import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import type { ComponentProps } from 'react'

export type TimeFieldProps = Omit<ComponentProps<'input'>, 'type'> & {
  invalid?: boolean
}

/** A time of day as "HH:mm", the prototypes' type="time" .input (session Starts / Ends). */
export function TimeField({ invalid, className, ...props }: TimeFieldProps) {
  const field = useFieldControl()
  return (
    <input
      type="time"
      {...field}
      {...props}
      className={cn(inputVariants({ invalid }), className)}
    />
  )
}
