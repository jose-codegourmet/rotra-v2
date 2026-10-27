import { cva, type VariantProps } from 'class-variance-authority'

// The prototypes' .court and .court.busy; .court.merged spans two grid rows so a 5v5 reads as one area.
export const courtCardVariants = cva(
  'flex min-h-[180px] min-w-0 flex-col gap-2.5 rounded-lg border border-border-strong bg-surface p-3.5 shadow-card',
  {
    variants: {
      variant: {
        'in-game':
          'border-accent bg-[linear-gradient(180deg,var(--color-accent-subtle),transparent_70%)]',
        free: '',
      },
      merged: {
        true: 'row-span-2',
        false: '',
      },
    },
    defaultVariants: { variant: 'free', merged: false },
  },
)

export type CourtCardVariants = VariantProps<typeof courtCardVariants>
