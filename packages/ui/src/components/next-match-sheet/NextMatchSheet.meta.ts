import type { ComponentMeta } from '@rotra/ui/meta'

export const nextMatchSheetMeta = {
  name: 'NextMatchSheet',
  description: 'A slider of up to five ready matches, one per card, after a result. Each has teams, games played and Pick this.',
  usage: [
    'Pass candidates in Main Queue order; only the first five are shown. Empty candidates show Close and the no-ready-match notice.',
    'Each team accepts CourtPlayer lists with games; the legacy string form supports the existing console until its screen ticket is wired.',
    'Arrows, mouse or pen dragging and native touch scrolling navigate without selecting; Pick this places a match. Reduced motion disables smooth arrow scrolling.',
    'Pass the stale-pick error if readiness changed, and isPending while placement runs.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Next-match picker after a result (issue #579)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['ChooseMatchSheet', 'ConfirmResultSheet', 'Sheet', 'Chip', 'Notice'],
} satisfies ComponentMeta
