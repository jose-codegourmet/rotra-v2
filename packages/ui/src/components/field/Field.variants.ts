import { cva, type VariantProps } from 'class-variance-authority'

// The prototypes' .input, shared by every text-like control (inputs, textarea, select and date
// triggers): field background, strong border, accent focus ring, error border.
export const inputVariants = cva(
  [
    'w-full min-h-11 rounded-md border border-border-strong bg-field px-3 py-2 text-fg',
    'placeholder:text-fg3',
    'focus:border-transparent focus:outline-2 focus:outline-offset-0 focus:outline-accent',
    'disabled:cursor-not-allowed disabled:opacity-45',
    'aria-invalid:border-error',
  ],
  {
    variants: {
      invalid: { true: 'border-error', false: '' },
    },
    defaultVariants: { invalid: false },
  },
)

export type InputVariants = VariantProps<typeof inputVariants>
