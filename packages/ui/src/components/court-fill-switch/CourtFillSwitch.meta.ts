import type { ComponentMeta } from '@rotra/ui/meta'

export const courtFillSwitchMeta = {
  name: 'CourtFillSwitch',
  description:
    'The Courts header switch Manual Queue | Auto Queue with its helper line: "You put each match on a court." or "Free courts get the next ready match. You still start each one."',
  usage: [
    'Use once in the Courts header of Q-COURTS (Live console › Session tab), under "Courts" and "F of C free".',
    'Every session starts on Manual Queue; the Queue Master can change it at any time. The container owns the value and the fill itself (turning Auto Queue on fills every free open court in court order; turning it off leaves Getting ready matches where they are).',
    'Auto Queue puts matches On court only; neither mode ever starts a match. Do not confuse it with Generate matches (the draft generator, formerly called Auto Queue).',
    'Arrow keys move between the two options; the helper line is announced politely when it changes.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Courts › courtsPane() (.seg "Court filling" and its helper line)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['SegmentedControl', 'CourtCard'],
} satisfies ComponentMeta
