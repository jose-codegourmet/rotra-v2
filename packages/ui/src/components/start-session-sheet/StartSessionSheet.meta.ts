import type { ComponentMeta } from '@rotra/ui/meta'

export const startSessionSheetMeta = {
  name: 'StartSessionSheet',
  description:
    'D-START-SESSION on ConfirmSheet: Session, Courts, Formats, Mode, Minimum and Roster, the level-lock notice, the offline line when starting offline, Back and Start session.',
  usage: [
    'Open from StartSessionBar or the phone dock; the container runs useStartSession and re-checks the blocker at confirm (error shows in the sheet).',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › SHEETS.start',
  },
  docs: ['docs/screens/product/dialogs.md', 'docs/screens/product/modules/queue/session-setup.md'],
  related: ['ConfirmSheet', 'StartSessionBar'],
} satisfies ComponentMeta
