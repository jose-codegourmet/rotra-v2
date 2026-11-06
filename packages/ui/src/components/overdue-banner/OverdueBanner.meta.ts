import type { ComponentMeta } from '@rotra/ui/meta'

export const overdueBannerMeta = {
  name: 'OverdueBanner',
  description:
    'The live console overdue reminder (T5): once the planned end has passed, a warning notice "Planned end passed N ago." with Set end time and Session done. The session never closes by itself.',
  usage: [
    'Place at the top of the Session view in Q-CONSOLE. It renders nothing before the planned end, so it can stay mounted.',
    'Set end time opens Courts and time (Q-SESSION-ADJUST) with `focusEnd`; Session done opens the Session done flow. Pass `offline` to disable Session done.',
    'Use `sessionEndStatus(endsAt, now)` from this module for the same "N left" / "Planned end passed N ago" text in the live header, the dashboard live card and Courts and time.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE › Session view (endStatus().over notice)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/sessions/README.md#times-and-days',
  ],
  related: ['Notice', 'CourtsAndTimeSheet', 'NowCard'],
} satisfies ComponentMeta
