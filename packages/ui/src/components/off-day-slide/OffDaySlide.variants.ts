import { cva, type VariantProps } from 'class-variance-authority'

// The private preview shows the .private-band at the top; the public variant (after explicit
// inclusion in a publication) never renders it.
export const offDaySlideVariants = cva('', {
  variants: {
    variant: {
      private: '',
      public: '',
    },
  },
  defaultVariants: { variant: 'private' },
})

export type OffDaySlideVariants = VariantProps<typeof offDaySlideVariants>
