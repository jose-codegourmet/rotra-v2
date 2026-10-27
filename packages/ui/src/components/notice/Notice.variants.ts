import { cva, type VariantProps } from 'class-variance-authority'

// The prototypes' .notice and its .ok / .warn / .bad modifiers. "offline" is the warn look the
// prototypes use for "Working offline on this device…" banners.
export const noticeVariants = cva(
  'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
  {
    variants: {
      tone: {
        info: 'border-border-strong bg-surface',
        success: 'border-accent bg-accent-subtle',
        warn: 'border-warn bg-warn-subtle',
        error: 'border-error bg-error-subtle',
        offline: 'border-warn bg-warn-subtle',
      },
    },
    defaultVariants: { tone: 'info' },
  },
)

export type NoticeVariants = VariantProps<typeof noticeVariants>
