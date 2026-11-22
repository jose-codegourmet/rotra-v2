import type { ComponentMeta } from '@rotra/ui/meta'

export const slotTransferFormMeta = {
  name: 'SlotTransferForm',
  description:
    'Transfer my slot: a sheet where a confirmed signed-in player finds another registered ROTRA player by exact RTR ID and sends the transfer request to the Queue Master.',
  usage: [
    'onFind receives the normalized RTR ID; the container runs the lookup and passes recipient (name, RTR ID, picture, waitlist place) or findError back.',
    'Send transfer request is enabled only while the found recipient matches the typed RTR ID; call onRtrIdChange to clear a stale result.',
    'Shown from My night before the start only. Nothing moves until the Queue Master approves.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › My night › Transfer my slot (SHEETS.slotTransfer)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['Sheet', 'Field', 'TextInput', 'Avatar', 'MyNightCard'],
} satisfies ComponentMeta
