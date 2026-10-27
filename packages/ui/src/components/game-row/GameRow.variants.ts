import { cva } from 'class-variance-authority'
export const gameResultVariants = cva(
  'grid size-[30px] place-items-center rounded-lg text-[13px] font-extrabold',
  {
    variants: {
      result: {
        won: 'bg-accent-subtle text-accent',
        lost: 'bg-elev text-fg2',
        partial: 'border border-dashed border-border-strong text-fg3',
      },
    },
  },
)
