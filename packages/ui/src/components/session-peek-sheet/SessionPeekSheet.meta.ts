import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionPeekSheetMeta = {
  name: 'SessionPeekSheet',
  description:
    "The read-only session summary that a clash's View it opens: state chip, when, venue, courts and roster count, with Back to setup (draft untouched) or Close, and Open live session / preparation / session record.",
  usage: [
    'Open from ClashNotice or a skipped RepeatSchedulePanel date; the container routes onOpen by state.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › SHEETS.peek',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['ClashNotice', 'RepeatSchedulePanel', 'Sheet'],
} satisfies ComponentMeta
