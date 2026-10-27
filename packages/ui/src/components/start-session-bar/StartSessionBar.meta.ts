import type { ComponentMeta } from '@rotra/ui/meta'

export const startSessionBarMeta = {
  name: 'StartSessionBar',
  description:
    'The sticky Start bar on preparation: the first blocking reason in amber (levels missing, another session live with Open TITLE, no download while offline, license ended) or the ready line, and Start session.',
  usage: [
    'The container passes startBlocker() from @rotra/data. On phones (≤ 900 px) the dock carries Start session: the bar shows only the reason, or hides when ready.',
    'Inside the operator shell the bar starts at the rail edge through the --rail custom property.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › viewPrepare() .footer-bar',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['StartSessionSheet', 'BottomDock', 'DeviceDownloadCard'],
} satisfies ComponentMeta
