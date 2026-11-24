import type { ComponentMeta } from '@rotra/ui/meta'
export const mySessionsCardMeta = {
  name: 'MySessionsCard',
  description:
    'Upcoming sessions on Home (P-HOME): requested, confirmed and waitlisted sessions, then Finished. The live session is the Current session card.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Home (Upcoming sessions)',
  },
  variants: ['AllStatuses', 'Empty', 'ShareResult', 'LongTitle'],
} satisfies ComponentMeta
