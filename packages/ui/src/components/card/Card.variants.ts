import { cva, type VariantProps } from 'class-variance-authority'

export const cardVariants = cva('min-w-0 rounded-lg border bg-surface shadow-card', {
  variants: {
    tone: {
      default: 'border-border',
      // .card.hl: the selected or current item
      highlight: 'border-accent shadow-[inset_0_0_0_1px_var(--accent-subtle)]',
      // admin .card.warnc: something waits on the owner
      warn: 'border-warn/60',
    },
    padding: {
      default: 'p-4',
      // .card.li: a card holding one list row
      row: 'px-4 py-3.5',
      none: 'p-0',
    },
  },
  defaultVariants: { tone: 'default', padding: 'default' },
})

export type CardVariants = VariantProps<typeof cardVariants>
