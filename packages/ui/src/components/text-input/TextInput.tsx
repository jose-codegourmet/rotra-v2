'use client'

import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import type { ComponentProps } from 'react'

export type TextInputProps = ComponentProps<'input'> & {
  /** Shows the error border; inside a Field this follows the Field's error automatically */
  invalid?: boolean
}

/** The prototypes' .input for one line of text, numbers, email or phone. */
export function TextInput({ invalid, className, type = 'text', ...props }: TextInputProps) {
  const field = useFieldControl()
  return (
    <input
      type={type}
      {...field}
      {...props}
      className={cn(inputVariants({ invalid }), className)}
    />
  )
}
