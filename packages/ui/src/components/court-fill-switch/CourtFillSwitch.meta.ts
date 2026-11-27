import type { ComponentMeta } from '@rotra/ui/meta'

export const courtFillSwitchMeta = {
  name: 'CourtFillSwitch',
  description:
    'The Courts header row: a bold "Auto Queue" label, a switch (on = Auto Queue, off = Manual Queue), an ⓘ that opens How courts get matches, the layout switch on the right, and the helper line: "You put each match on a court." or "Free courts get the next ready match. You still start each one."',
  usage: [
    'Use once in the Courts header of Q-COURTS (Live console › Session tab), under "Courts" and "F of C free". Pass the Court layout switch (QueueViewSwitch) as trailing.',
    'Every session starts on Manual Queue (switch off); the Queue Master can change it at any time. The container owns the value and the fill itself (turning Auto Queue on fills every free open court in court order; turning it off leaves Getting ready matches where they are).',
    'onOpenInfo opens CourtFillInfoSheet (How courts get matches); the ⓘ button, named and titled "How Auto Queue works", shows only when it is passed.',
    'Auto Queue puts matches On court only; neither mode ever starts a match. Do not confuse it with Generate matches (the draft generator, formerly called Auto Queue).',
    'The helper line is announced politely when it changes.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Live console › Courts › courtsPane() (.fill-sw switch row, the ⓘ openFillInfo and its helper line)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
    'docs/mockup-changes/2026-11-26-queue-free-court-flow.md',
  ],
  related: ['Switch', 'CourtFillInfoSheet', 'QueueViewSwitch', 'CourtCard'],
} satisfies ComponentMeta
