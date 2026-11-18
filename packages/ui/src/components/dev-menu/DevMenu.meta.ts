import type { ComponentMeta } from '@rotra/ui/meta'
export const devMenuMeta = {
  name: 'DevMenu',
  description:
    'Prototype controls with Queue sync, recovery, download and authorization scenarios, plus Player Information rank/leaderboard and account previews, and an Admin-only scenario section.',
  usage: [
    'Mount only in development or with the explicit developer-menu build flag.',
    'inviteStanding adds the Not on it / Already in / Waitlisted switch for the signed-in player on the seeded Session invite (Player app, mock mode, flag on, signed in).',
    'googleDeadline adds the Before / After the Google deadline switch (Player app, mock mode, only while the player_google_sign_in flag is on).',
    'verificationScenarios switches the mock demo account between the Verification fixtures.',
    'Player link previews stay disabled until their callbacks are supplied. Account/private flows are not implemented by this component.',
  ],
  prototype: { file: 'apps/mockup/queue-app/rotra-queue.html', screen: 'Prototype controls' },
  variants: [
    'admin',
    'default',
    'offline',
    'expired',
    'save-failure',
    'conflict',
    'player-scenarios',
  ],
  related: ['Sheet', 'Switch', 'SegmentedControl'],
  docs: ['apps/mockup/player-app/rotra-player.html'],
} satisfies ComponentMeta
