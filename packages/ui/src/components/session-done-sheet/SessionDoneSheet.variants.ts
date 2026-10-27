import { cva, type VariantProps } from 'class-variance-authority'

// The three bodies of the prototype's SHEETS.done share the sheet body's 14 px stack (.sb). The
// step is a cva variant so the container only switches it and passes values; the minimum step's
// list sits flush against the copy under it (the prototype's .list + .small.muted).
export const sessionDoneSheetVariants = cva('flex min-w-0 flex-col', {
  variants: {
    step: {
      review: 'gap-3.5',
      minimum: 'gap-3',
      confirm: 'gap-3.5',
    },
  },
  defaultVariants: { step: 'review' },
})

export type SessionDoneSheetVariants = VariantProps<typeof sessionDoneSheetVariants>
