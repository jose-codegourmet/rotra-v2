import { cva, type VariantProps } from 'class-variance-authority'

export const leaderboardRowVariants = cva(
  'grid min-h-14 w-full grid-cols-[56px_36px_minmax(0,1fr)_minmax(0,auto)] items-center gap-3 rounded-md border-0 bg-transparent px-3 py-2 text-left max-[560px]:grid-cols-[44px_36px_minmax(0,1fr)] max-[560px]:gap-y-0 max-[560px]:px-2',
  {
    variants: {
      variant: {
        default: 'hover:bg-elev',
        me: 'bg-accent-subtle shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_45%,transparent)] hover:bg-accent-subtle',
        'medal-1':
          'min-h-[66px] bg-linear-to-r from-gold/15 to-transparent hover:from-gold/25 hover:to-elev',
        'medal-2':
          'min-h-[66px] bg-linear-to-r from-silver/15 to-transparent hover:from-silver/25 hover:to-elev',
        'medal-3':
          'min-h-[66px] bg-linear-to-r from-bronze/15 to-transparent hover:from-bronze/25 hover:to-elev',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type LeaderboardRowVariants = VariantProps<typeof leaderboardRowVariants>
