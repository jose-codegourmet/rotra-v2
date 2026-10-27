import type { ComponentMeta } from '@rotra/ui/meta'

export const repeatSchedulePanelMeta = {
  name: 'RepeatSchedulePanel',
  description:
    'Session setup › Repeats: Does not repeat / Every week / Every 2 weeks / Every month, the number of sessions, each date with ✓ or its clash (skipped, with View it), and the created-versus-skipped summary.',
  usage: [
    'New sessions only (editing a saved session never repeats). The occurrences come from sessionOccurrences() in @rotra/data; the component only shows them.',
    'Pass `error` when every date clashes; a single non-repeating clash uses ClashNotice instead.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › repeatPanel() (.occ-list)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['ClashNotice', 'SessionPeekSheet', 'SessionSetupForm', 'CountStepper'],
} satisfies ComponentMeta
