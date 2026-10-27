import type { ComponentMeta } from '@rotra/ui/meta'

export const nowCardMeta = {
  name: 'NowCard',
  description:
    'The full-width card under the club header that shows exactly one of: the live session (Continue session), the earliest prepared session with a countdown (Open preparation), or Nothing planned (Create session).',
  usage: [
    'Use once on Q-HOME. Live and upcoming differ by edge, tint and a filled versus outlined badge, never by colour alone.',
    'Pass `now` for a fixed time in stories; countdown and "time left" text come from NowCard.helpers.',
    'On phones (≤ 700 px) the action drops below the stats at full width.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-HOME › nowCard() (.now-card.live / .now-card.next)',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/business_logic/product/queue/modules/sessions/README.md',
  ],
  variants: ['live', 'upcoming', 'nothing'],
  related: ['ClubHeader', 'SessionCalendar', 'Button'],
} satisfies ComponentMeta
