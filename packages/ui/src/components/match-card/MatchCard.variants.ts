import { cva, type VariantProps } from 'class-variance-authority'

// The prototype's .qtile: a waiting match in the queue grid. Ready (.qtile.ready, 2026-11-19): full accent
// border, --accent-subtle tint and the accent glow, with a "Ready for court" pill the component adds.
// Needs attention (2026-11-19, no yellow border) keeps the plain border and only its warning status line;
// Auto Queue drafts keep their warn border (.qtile.draft.attn).
export const matchCardVariants = cva(
  'relative flex min-w-0 flex-col gap-1.5 rounded-lg border bg-surface p-2.5 shadow-card',
  {
    variants: {
      status: {
        ready:
          'border-accent bg-[linear-gradient(var(--accent-subtle),var(--accent-subtle))] shadow-[var(--shadow),0_0_16px_color-mix(in_srgb,var(--accent)_25%,transparent)]',
        'needs-attention': 'border-border-strong',
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
    compoundVariants: [{ status: 'needs-attention', draft: 'idle', className: 'border-warn' }],
    defaultVariants: { status: 'ready', draft: 'none' },
  },
)

export type MatchCardVariants = VariantProps<typeof matchCardVariants>
