import type { ComponentMeta } from '@rotra/ui/meta'

export const slotMeterMeta = {
  name: 'SlotMeter',
  description:
    'The slots meter on the roster: "N/M slots · N left before the waitlist" (accent), amber when 2 or fewer are left, "Full · new players go on the waitlist", "N over budget …", plus the waitlist count.',
  usage: ['Use under the Roster and levels header in preparation; the bar is a role=meter.'],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › slotMeter() (.slot-meter)',
  },
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  variants: ['ok', 'near', 'full', 'over'],
  related: ['RosterPanel', 'WaitlistPanel'],
} satisfies ComponentMeta
