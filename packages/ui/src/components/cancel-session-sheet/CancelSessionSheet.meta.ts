import type { ComponentMeta } from '@rotra/ui/meta'

export const cancelSessionSheetMeta = {
  name: 'CancelSessionSheet',
  description:
    'D-CANCEL-SESSION: Cancel TITLE?, when, how many joined and waitlisted, a paid warning when any are marked paid, optional Reason, then Keep session and Cancel session. Final: refunds happen outside ROTRA.',
  usage: [
    "Open from Cancel session on a prepared session's Preparation header; never once the session has started.",
    'The container runs the cancel command (Q12.15); this sheet only collects the optional reason and reports onConfirm(reason).',
    'Do not use for deleting a session nobody is confirmed in — that is DeleteSessionSheet.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.cancelSession',
  },
  docs: [
    'docs/screens/product/dialogs.md#d-cancel-session--cancel-session',
    'docs/business_logic/product/queue/modules/sessions/README.md#cancelling-a-session-owner-decision-november-6-2026',
  ],
  variants: ['unpaid', 'paid'],
  related: ['DeleteSessionSheet', 'Sheet', 'Notice', 'SessionRecordHeader'],
} satisfies ComponentMeta
