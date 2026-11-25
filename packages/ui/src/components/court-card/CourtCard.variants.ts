import { cn } from '@rotra/ui/cn'
import { cva, type VariantProps } from 'class-variance-authority'

// The prototypes' .court, .court.oncourt and .court.busy; .court.merged spans two grid rows so a 5v5
// reads as one area. Playing (.court.busy) has a steady accent border glow, never a pulse; Getting ready
// (.court.oncourt) keeps the plain card's border.
export const courtCardVariants = cva(
  'flex min-h-[180px] min-w-0 flex-col gap-2.5 rounded-lg border border-border-strong bg-surface p-3.5 shadow-card',
  {
    variants: {
      variant: {
        'in-game':
          'border-accent bg-[linear-gradient(180deg,var(--color-accent-subtle),transparent_70%)] shadow-[0_0_0_1px_var(--color-accent),0_0_18px_2px_color-mix(in_srgb,var(--color-accent)_38%,transparent)]',
        'on-court': '',
        free: '',
      },
      merged: {
        true: 'row-span-2',
        false: '',
      },
    },
    defaultVariants: { variant: 'free', merged: false },
  },
)

export type CourtCardVariants = VariantProps<typeof courtCardVariants>

/**
 * A free open court as a drop target for a dragged match drawing (the mockup's
 * body.court-dragging [data-free-court]): a dashed accent outline while any drawing is dragged,
 * solid with a tint under the pointer. `dragging` and `dragOver` force the same looks from props.
 */
export function freeCourtDropClass({
  dragging = false,
  dragOver = false,
}: {
  dragging?: boolean
  dragOver?: boolean
}) {
  return cn(
    '[:is(body[data-court-dragging])_&]:outline-2 [:is(body[data-court-dragging])_&]:outline-accent [:is(body[data-court-dragging])_&]:outline-offset-2',
    '[:is(body[data-court-dragging])_&:not([data-court-drop])]:outline-dashed',
    'data-court-drop:bg-accent-subtle!',
    // The dragged drawing's own busy court is no target (owner, November 25, 2026: trade courts)
    'data-court-source:outline-none!',
    dragging && !dragOver && 'outline-2 outline-dashed outline-accent outline-offset-2',
    dragOver && 'outline-2 outline-accent outline-offset-2 bg-accent-subtle!',
  )
}
