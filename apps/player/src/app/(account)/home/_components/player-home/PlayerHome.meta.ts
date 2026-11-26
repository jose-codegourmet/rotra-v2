import type { ComponentMeta } from '@rotra/ui/meta'
export const playerHomeMeta = {
  name: 'PlayerHome',
  description:
    'P-HOME: the signed-in player home at /home. Hi NAME, the Current session card, then two columns: Upcoming sessions and Your clubs on the left, Your stats (shared rank card, then the year Weekly Performance) on the right; one column on phones. Wires existing hooks to @rotra/ui cards.',
  usage: [
    'Signed out goes to /login with returnTo=/home (proxy.ts, and a client guard for mock mode).',
    'The live session is the Current session card; Upcoming sessions lists the rest.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'viewHome' },
} satisfies ComponentMeta
