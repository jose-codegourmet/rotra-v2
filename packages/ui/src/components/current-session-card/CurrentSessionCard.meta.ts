import type { ComponentMeta } from '@rotra/ui/meta'

export const currentSessionCardMeta = {
  name: 'CurrentSessionCard',
  description:
    'P-HOME: the highlighted "Happening now" session the signed-in player is in with an Open session page button, or a plain card saying no session is running.',
  usage: [
    'Pass session while one of the player\'s sessions is live; omit it for "No session right now."',
    'Pass linkAs={Link} so Open session page navigates client-side.',
    'Upcoming sessions stay in MySessionsCard.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'currentSessionCard()' },
  docs: [
    'docs/mockup-changes/2026-11-19-player-home.md',
    'docs/screens/product/modules/player-information/profile.md',
  ],
  variants: ['live', 'none'],
  related: ['MySessionsCard', 'ActiveSessionCard', 'NowCard'],
} satisfies ComponentMeta
