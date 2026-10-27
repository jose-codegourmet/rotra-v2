import { cva, type VariantProps } from 'class-variance-authority'

// The prototypes' .btn and its modifiers. Touch sizes come from the experience contract:
// standard 48 px, sm and xs 44 px on touch screens or windows ≤ 1024 px.
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface',
    'text-center font-semibold no-underline select-none',
    'hover:not-disabled:bg-elev disabled:cursor-not-allowed disabled:opacity-45',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
    'aria-pressed:border-accent aria-pressed:bg-accent-subtle',
  ],
  {
    variants: {
      variant: {
        secondary: '',
        primary:
          'border-accent bg-accent text-on-accent hover:not-disabled:bg-accent-dim aria-pressed:bg-accent',
        ghost: 'border-transparent bg-transparent',
        danger: 'border-error bg-transparent text-error',
      },
      size: {
        md: 'min-h-11 px-4 touch:min-h-12 touch:px-[18px] touch:text-base',
        sm: 'min-h-9 px-3 text-sm touch:min-h-11 touch:px-3.5 touch:text-[15px]',
        xs: 'min-h-8 rounded-md px-2.5 text-[13px] touch:min-h-11 touch:px-3 touch:text-sm',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md', block: false },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
