import type { ComponentMeta } from '@rotra/ui/meta'

export const noShowPanelMeta = {
  name: 'NoShowPanel',
  description:
    'The live Players view\'s "No show (cancelled) · N" card above the waitlist: each player\'s face, name and "Marked TIME", with Back to roster (disabled while the roster is full, with "The roster is full. Free a slot to bring someone back.").',
  usage: [
    'Render it on the live Players view above the WaitlistPanel; it renders nothing without entries.',
    'The container owns the Back to roster mutation and its toast "NAME back on the roster · 24/24".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'noShowPanel(), ACT.undoNoShow',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/business_logic/product/queue/modules/players/README.md',
    'docs/mockup-changes/2026-11-13-queue-no-show-cancelled.md',
  ],
  variants: ['default', 'roster full', 'saving'],
  related: ['PlayerPoolCard', 'WaitlistPanel', 'ConfirmSheet'],
} satisfies ComponentMeta
