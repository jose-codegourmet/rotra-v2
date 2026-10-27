'use client'

import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import type { ComponentProps } from 'react'

export type TextareaProps = ComponentProps<'textarea'> & {
  invalid?: boolean
}

/** The prototypes' textarea.input: at least 80 px tall, resizes vertically. */
export function Textarea({ invalid, className, ...props }: TextareaProps) {
  const field = useFieldControl()
  return (
    <textarea
      {...field}
      {...props}
      className={cn(inputVariants({ invalid }), 'min-h-20 resize-y', className)}
    />
  )
}
