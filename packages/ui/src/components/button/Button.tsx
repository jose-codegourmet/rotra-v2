import { cn } from '@rotra/ui/cn'
import { Spinner } from '@rotra/ui/spinner'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { type ButtonVariants, buttonVariants } from './Button.variants'

export type ButtonProps = ComponentProps<'button'> &
  ButtonVariants & {
    /** Renders the child element (e.g. a link) with button styles instead of a <button> */
    asChild?: boolean
    /** Pending work: disables the button so one tap cannot fire twice, and shows a spinner */
    loading?: boolean
  }

/** The prototypes' .btn: primary, secondary, ghost and danger, in md, sm and xs sizes. */
export function Button({
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  className,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className)

  if (asChild) {
    return (
      <Slot.Root className={classes} aria-disabled={disabled || loading || undefined} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Spinner className={variant === 'primary' ? 'border-t-on-accent' : undefined} />
      ) : null}
      {children}
    </button>
  )
}
