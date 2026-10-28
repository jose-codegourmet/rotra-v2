import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .pc3: a selectable player card in the Players view. Selected cards get an accent
// border plus an inset ring and the subtle accent fill; playing cards colour their status line;
// away cards grey their picture out.
export const playerPoolCardVariants = cva(
  [
    'relative flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-lg border border-border-strong bg-surface p-2.5 text-left select-none',
    'hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'aria-pressed:border-accent aria-pressed:bg-accent-subtle aria-pressed:shadow-[inset_0_0_0_2px_var(--accent)]',
  ],
  {
    variants: {
      state: {
        available: '',
        playing: '',
        away: '',
      },
    },
    defaultVariants: { state: 'available' },
  },
)

export type PlayerPoolCardVariants = VariantProps<typeof playerPoolCardVariants>
