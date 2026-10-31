import type { ComponentMeta } from '@rotra/ui/meta'

export const invalidSessionConfirmMeta = {
  name: 'InvalidSessionConfirm',
  description:
    'The D-INVALID-SESSION confirmation: the inconsistent Queue Session, its date and time, the reason, the permanent consequence, Back to recovery and Confirm invalid session.',
  usage: [
    'Reached from D-INTERRUPTION when the answer is No, or from Q-UNRECOVERABLE when the original device is lost (wired in Q11). Mount it as the body of a Sheet; the sheet focuses its title so Confirm is never preselected.',
    'Pass isPending from the mutation: Confirm shows a spinner and a second tap cannot commit again. Keep the sheet open and show the failure if the save fails.',
    'Pass when already formatted (date · time). The consequence copy is word for word from dialogs.md; do not reword it.',
    'Never add Reconstruct, Edit winners or a score entry here: a lost original device cannot be bypassed by typing remembered scores.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen:
      'viewHistory › Tuesday Drills (invalid session record); D-INVALID-SESSION has no prototype sheet',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-invalid-session--no-official-session-outcome',
    'docs/screens/product/modules/queue/offline-recovery.md',
    'docs/business_logic/product/queue/modules/offline/README.md#interrupted-device',
  ],
  related: ['ConfirmSheet', 'Sheet', 'InvalidSessionNotice'],
} satisfies ComponentMeta
