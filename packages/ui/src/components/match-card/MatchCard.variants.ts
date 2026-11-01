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
      // An Auto Queue draft: dashed until picked, then the Players tiles' picked look (.pc3[aria-pressed]).
      draft: {
        none: '',
        idle: 'cursor-pointer border-dashed select-none hover:border-accent/60',
        selected:
          'cursor-pointer border-solid border-accent bg-accent-subtle inset-ring-2 inset-ring-accent select-none',
      },
    },
    defaultVariants: { status: 'ready', draft: 'none' },
  },
)

export type MatchCardVariants = VariantProps<typeof matchCardVariants>
