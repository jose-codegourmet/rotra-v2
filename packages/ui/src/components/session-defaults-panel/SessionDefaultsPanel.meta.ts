import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionDefaultsPanelMeta = {
  name: 'SessionDefaultsPanel',
  description:
    'Club settings › Session defaults: players per court (the slot budget for each reserved court) and an optional default entrance fee per head.',
  usage: [
    'Players per court is 2–20; the copy shows the slot budget for 3 courts and that extra players go on the waitlist.',
    'The entrance fee is optional: the switch shows an amount field with Save; turning it off calls onClearEntranceFee. Amounts are integer centavos.',
    'These only fill in new sessions; each session can still change them.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Club settings › Session defaults (#club-defaults)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['CountStepper', 'Switch', 'ClubSettingsMenu'],
} satisfies ComponentMeta
