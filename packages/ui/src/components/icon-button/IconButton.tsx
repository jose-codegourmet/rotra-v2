import { Button, type ButtonProps } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'

export type IconButtonProps = Omit<ButtonProps, 'aria-label' | 'block'> & {
  /** Accessible name, also shown as the tooltip ("Close", "Switch to light mode") */
  label: string
}

/** The prototypes' .btn.icon-btn: a square button holding one Icon, at least 44 × 44 px on touch. */
export function IconButton({ label, title, className, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={title ?? label}
      className={cn('min-w-9 px-0 touch:min-w-11 touch:px-0', className)}
      {...props}
    />
  )
}
