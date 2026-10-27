import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .lv-diff: text + arrow or check, coloured by direction.
export const levelDiffVariants = cva('inline-flex items-center gap-1.5 text-xs font-semibold', {
  variants: {
    direction: {
      higher: 'text-warn',
      lower: 'text-error',
      same: 'font-medium text-accent',
    },
  },
  defaultVariants: { direction: 'same' },
})

export type LevelDiffVariants = VariantProps<typeof levelDiffVariants>
