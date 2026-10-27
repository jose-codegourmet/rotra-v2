import { cva, type VariantProps } from 'class-variance-authority'

// The prototypes' .chip and its .ok / .warn / .bad / .solid modifiers; "live" adds the pulsing dot
// the admin prototype draws as .live.
export const chipVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-border-strong text-fg2',
        accent: 'border-accent/45 bg-accent-subtle text-accent',
        warn: 'border-warn/45 bg-warn-subtle text-warn',
        error: 'border-error/45 bg-error-subtle text-error',
        solid: 'border-border-strong bg-elev text-fg',
        live: 'border-accent/45 bg-accent-subtle text-accent',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type ChipVariants = VariantProps<typeof chipVariants>
