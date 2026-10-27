import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .ptile: a large, centered player tile. Pressed tiles get the accent border, inset
// ring and subtle fill; busy (playing) tiles colour the status line warn, fresh (resting) tiles accent,
// away tiles grey the picture out.
export const playerTileVariants = cva(
  [
    'group/tile flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg border border-border-strong bg-bg px-2 pt-3.5 pb-3 text-center text-fg',
    'transition-[border-color,transform] duration-[120ms] motion-reduce:transition-none',
    'hover:not-disabled:-translate-y-px hover:not-disabled:border-accent motion-reduce:hover:not-disabled:translate-y-0',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'aria-pressed:border-accent aria-pressed:bg-accent-subtle aria-pressed:shadow-[inset_0_0_0_1px_var(--accent)]',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'touch:min-h-[60px]',
  ],
  {
    variants: {
      state: {
        /** Playing now: the status line reads warn */
        busy: '[&_[data-slot=status]]:text-warn',
        /** Not present: greyed picture */
        away: '[&_[data-slot=picture]]:opacity-60 [&_[data-slot=picture]]:grayscale',
        /** Present and off court: the status line reads accent */
        fresh: '[&_[data-slot=status]]:text-accent',
        /** A note such as "Already in this match" or "Team A": muted status line */
        note: '',
      },
    },
    defaultVariants: { state: 'fresh' },
  },
)

export type PlayerTileVariants = VariantProps<typeof playerTileVariants>
