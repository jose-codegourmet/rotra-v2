import type { ComponentMeta } from '@rotra/ui/meta'

export const publicRefreshBarMeta = {
  name: 'PublicRefreshBar',
  description:
    'The line under the public session hero: "Updated 7:42 PM · Refresh", with "· Venue changes haven\'t synced yet" when changes are pending, and a Refresh button that is disabled for 10 seconds after a tap.',
  usage: [
    'Use under the hero of the public session page for signed-in viewers (D-2026-11-09-04). Pass the already-formatted time; the component only lays it out.',
    'Presentation only: the 10 second throttle state comes from the data hook (Q17.3) through refreshThrottled. Refresh reloads data, never the page.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › refreshBar()',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['PublicSessionHero', 'PublicSessionDetails', 'Button'],
} satisfies ComponentMeta
