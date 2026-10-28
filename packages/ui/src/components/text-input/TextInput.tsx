'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import { type ComponentProps, useState } from 'react'

export type TextInputProps = ComponentProps<'input'> & {
  /** Shows the error border; inside a Field this follows the Field's error automatically */
  invalid?: boolean
  /** Password fields can reuse the prototype's accessible Show/Hide control. */
  passwordVisibility?: boolean
}

/** The prototypes' .input for one line of text, numbers, email or phone. */
export function TextInput({
  invalid,
  className,
  type = 'text',
  passwordVisibility = false,
  ...props
}: TextInputProps) {
  const field = useFieldControl()
  const [visible, setVisible] = useState(false)
  const reveal = type === 'password' && passwordVisibility
  const input = (
    <input
      type={reveal && visible ? 'text' : type}
      {...field}
      {...props}
      className={cn(inputVariants({ invalid }), reveal && 'pr-20', className)}
    />
  )
  if (!reveal) return input
  return (
    <div className="relative">
      {input}
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-1/2 right-1 -translate-y-1/2"
        disabled={props.disabled}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? 'Hide' : 'Show'}
      </Button>
    </div>
  )
}
