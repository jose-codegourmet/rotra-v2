import type { ComponentMeta } from '@rotra/ui/meta'
export const refundConfirmSheetMeta = {
  name: 'RefundConfirmSheet',
  description:
    'D-REJECT-REFUND and D-SESSION-REFUND (#1014): confirm a manual full refund, stating the amount to hand back outside ROTRA. ROTRA only records it.',
  usage: [
    'variant="transfer": from Requests › Slot transfers › Reject and refund. Pass the sender, the recipient, the slot’s whole cash (the Requests row’s payment.paidMinor), any earlier waiver and the first eligible waitlisted player (FIFO), or null.',
    'variant="session": from a cancelled record’s Refund everyone who paid › Record refund. Pass the player and their whole cash.',
    'The amount is never a waived amount. The caller sends it back as the one confirmed; the server refuses a different one.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Requests › transferRow › rejectRefund sheet; cancelledRecord › refundCard › sessionRefund sheet',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/financials/README.md',
  ],
  related: ['ConfirmSheet', 'SlotTransferRow', 'RefundList'],
} satisfies ComponentMeta
