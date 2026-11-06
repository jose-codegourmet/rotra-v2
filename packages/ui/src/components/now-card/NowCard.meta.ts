import type { ComponentMeta } from '@rotra/ui/meta'

export const nowCardMeta = {
  name: 'NowCard',
  description:
    'The full-width card under the club header that shows exactly one of: the live session (Continue session), the earliest prepared session with a countdown (Open preparation), or Nothing planned (Create session).',
  usage: [
    'Use once on Q-HOME. Live and upcoming differ by edge, tint and a filled versus outlined badge, never by colour alone.',
    'Pass `now` for a fixed time in stories; the countdown and day-aware range come from NowCard.helpers.',
    'Live: "N left" until the planned end, then "Planned end passed N ago" in the warning color (T5), from `sessionEndStatus` in @rotra/ui/overdue-banner, the same text as the console header and overdue banner.',
    'Pass `downloadedHere: null` only when the active data mode has no device-download adapter; it renders “Not connected”, never a false “No”.',
    'On phones (≤ 700 px) the action drops below the stats at full width.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-HOME › nowCard() (.now-card.live / .now-card.next)',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/business_logic/product/queue/modules/sessions/README.md#times-and-days',
  ],
  variants: ['live', 'upcoming', 'nothing'],
  related: ['ClubHeader', 'SessionCalendar', 'Button', 'OverdueBanner'],
} satisfies ComponentMeta
