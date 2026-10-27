import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's viewHistory header (.stack.tight + .row of chips + .tiles4). Both states draw the
// same layout; the state variant keeps the two records addressable (chips and the Games "—" carry
// the difference in text, never colour alone).
export const sessionRecordHeaderVariants = cva('flex min-w-0 flex-col gap-5', {
  variants: {
    state: {
      completed: '',
      invalid: '',
    },
  },
  defaultVariants: { state: 'completed' },
})

export type SessionRecordHeaderVariants = VariantProps<typeof sessionRecordHeaderVariants>
