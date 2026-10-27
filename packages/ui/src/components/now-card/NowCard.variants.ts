import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .now-card: a 5 px edge on the left (accent while live), accent tint while live.
export const nowCardVariants = cva(
  [
    'relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-7 gap-y-4 overflow-hidden rounded-[18px] border bg-surface py-5 pr-[22px] pl-[26px] shadow-card',
    'before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[5px] before:content-[""]',
    'max-[700px]:grid-cols-[minmax(0,1fr)]',
  ],
  {
    variants: {
      variant: {
        live: 'border-accent bg-[linear-gradient(100deg,var(--accent-subtle),transparent_65%)] before:bg-accent',
        upcoming: 'border-border-strong before:bg-border-strong',
        nothing: 'border-border-strong before:bg-border-strong',
      },
    },
    defaultVariants: { variant: 'nothing' },
  },
)

export type NowCardVariants = VariantProps<typeof nowCardVariants>
