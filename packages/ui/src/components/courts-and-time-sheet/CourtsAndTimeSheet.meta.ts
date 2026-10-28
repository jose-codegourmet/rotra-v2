import type { ComponentMeta } from '@rotra/ui/meta'

export const courtsAndTimeSheetMeta = {
  name: 'CourtsAndTimeSheet',
  description:
    'The Courts and time sheet (Q-SESSION-ADJUST), opened by Extend time on the live console: the court labels with "Add a court…", "Ends at HH:MM" with Extend 30 min and Extend 60 min, and the note that occupied courts and running matches are not changed here.',
  usage: [
    'Pass the session\'s courts (not removed) and scheduledEndAt. onAddCourt opens AddCourtForm; onExtend(30 | 60) runs useExtendSession in the container, which shows the "Session now ends HH:MM" toast.',
    'Pass isPending while the extension runs so one tap cannot extend twice; the sheet stays open and Done closes it.',
    'Courts are not removed from here (that happens on the court tile), and mode, formats and the minimum are not offered during play: that is an open decision.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.adjust (ACT.openAdjust, ACT.quickAddCourt, ACT.extend)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-session-adjust--courts-and-time',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
  ],
  related: ['AddCourtForm', 'Sheet', 'Button'],
} satisfies ComponentMeta
