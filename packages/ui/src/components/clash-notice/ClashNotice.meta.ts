import type { ComponentMeta } from '@rotra/ui/meta'

export const clashNoticeMeta = {
  name: 'ClashNotice',
  description:
    'Session setup: the error notice for a single date that clashes with another club session ("…. Pick another date or time.") with View it.',
  usage: [
    'Shown on step 1 while a non-repeating date clashes; step 1 shows "needs details" and Next and save are blocked.',
    'The clash text comes from sessionOccurrences() in @rotra/data (Venue clash / Time clash).',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › repeatPanel() single clash notice',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['RepeatSchedulePanel', 'SessionPeekSheet', 'Notice'],
} satisfies ComponentMeta
