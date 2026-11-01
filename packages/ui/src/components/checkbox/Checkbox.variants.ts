import { cva, type VariantProps } from 'class-variance-authority'

export const checkboxVariants = cva(
  'cursor-pointer has-disabled:cursor-not-allowed has-disabled:opacity-45',
  {
    variants: {
      variant: {
        row: 'flex items-start gap-2.5 rounded-md border border-border-strong px-3 py-2.5',
        compact:
          'inline-flex size-8 flex-none items-center justify-center rounded-md hover:not-has-disabled:bg-elev has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent touch:size-11',
      },
    },
    defaultVariants: { variant: 'row' },
  },
)

export type CheckboxVariants = VariantProps<typeof checkboxVariants>
