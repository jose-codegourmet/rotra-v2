import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .pcard2 on the session record's Players tab. Both variants share the frame; the
// variant decides whether the stats and minimum chip show (counted) or "Not counted" (invalid session).
export const recordPlayerCardVariants = cva(
  'flex min-w-0 flex-col gap-2.5 rounded-lg border border-border-strong bg-surface p-3.5',
  {
    variants: {
      variant: {
        counted: '',
        'not-counted': '',
      },
    },
    defaultVariants: { variant: 'counted' },
  },
)

export type RecordPlayerCardVariants = VariantProps<typeof recordPlayerCardVariants>
