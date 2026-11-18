import { Button, type ButtonProps } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { GoogleMark } from '@rotra/ui/google-mark'

export type GoogleButtonProps = Omit<ButtonProps, 'children' | 'variant' | 'asChild' | 'loading'> & {
  /** Google's window is open: the label becomes "Waiting for Google…" and the button is disabled */
  pending?: boolean
  /** Replaces "Continue with Google", e.g. "Connect Google" on P-GOOGLE-REQUIRED */
  label?: string
}

/**
 * The prototype's .btn.google: the Google mark and "Continue with Google" on a neutral button, full
 * width. Presentational: the app starts the Google redirect in onClick.
 */
export function GoogleButton({
  pending = false,
  label = 'Continue with Google',
  block = true,
  disabled,
  className,
  ...props
}: GoogleButtonProps) {
  return (
    <Button
      block={block}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn('gap-2.5', className)}
      {...props}
    >
      <GoogleMark />
      {pending ? 'Waiting for Google…' : label}
    </Button>
  )
}
