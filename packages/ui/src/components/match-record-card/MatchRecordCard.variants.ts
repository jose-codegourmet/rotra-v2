import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .hm: one recorded match in a session record's court column. .invalid dims it with
// a dashed border; .now is the match on court at the replay's current moment.
export const matchRecordCardVariants = cva(
  'flex min-w-0 flex-col gap-1 rounded-md border border-border-strong bg-bg p-2',
  {
    variants: {
      state: {
        completed: '',
        invalid: 'border-dashed opacity-70',
      },
      highlighted: {
        true: 'border-accent shadow-[0_0_0_2px_var(--accent-subtle)]',
        false: '',
      },
    },
    defaultVariants: { state: 'completed', highlighted: false },
  },
)

export type MatchRecordCardVariants = VariantProps<typeof matchRecordCardVariants>
