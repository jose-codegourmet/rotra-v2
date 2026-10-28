import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .qtile: a waiting match in the queue grid. Ready leans the border towards the accent
// (.qtile.ready); needs attention paints it warn (.qtile.attn); the two temporary states keep the
// plain border.
export const matchCardVariants = cva(
  'relative flex min-w-0 flex-col gap-1.5 rounded-lg border bg-surface p-2.5 shadow-card',
  {
    variants: {
      status: {
        ready: 'border-accent/55',
        'needs-attention': 'border-warn',
        blocked: 'border-border-strong',
        'waiting-for-courts': 'border-border-strong',
      },
    },
    defaultVariants: { status: 'ready' },
  },
)

export type MatchCardVariants = VariantProps<typeof matchCardVariants>
