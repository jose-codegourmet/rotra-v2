import { cva, type VariantProps } from 'class-variance-authority'

// The download chip tones per state; the text always carries the state too.
export const deviceDownloadChipVariants = cva('', {
  variants: {
    state: { none: 'neutral', downloading: 'warn', ready: 'accent' },
  },
  defaultVariants: { state: 'none' },
})

export type DeviceDownloadVariants = VariantProps<typeof deviceDownloadChipVariants>
