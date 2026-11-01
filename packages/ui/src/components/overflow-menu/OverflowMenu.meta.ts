import type { ComponentMeta } from '@rotra/ui/meta'

export const overflowMenuMeta = {
  name: 'OverflowMenu',
  description:
    'A ⋯ icon button that opens a short list of secondary actions. A disabled item shows its reason under its label.',
  usage: [
    'Use for actions that would crowd a card: keep the one action that matters for the current state on the card and move the rest here (the court card: Edit, Undo early open, Remove).',
    'Name the trigger after its target ("More for Court 4").',
    'Pass disabledReason instead of hiding an action that is not allowed right now ("A match is on this court").',
    'Items run without their own dialog; an item that needs one opens it from onSelect.',
    'Give description when the label alone does not say what happens (Auto Queue: "Keeps only the drafts you picked."). Use align="start" when the trigger sits beside a left-aligned button.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtMenu() (.cmenu)',
  },
  docs: ['docs/screens/product/modules/queue/session-console.md'],
  variants: ['closed', 'open', 'with a disabled item'],
  related: ['CourtCard', 'IconButton'],
} satisfies ComponentMeta
