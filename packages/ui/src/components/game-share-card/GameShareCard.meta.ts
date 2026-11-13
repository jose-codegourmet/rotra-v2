import type { ComponentMeta } from '@rotra/ui/meta'

export const gameShareCardMeta = {
  name: 'GameShareCard',
  description:
    'Share game: one of your own games as the hero of the Story, Facebook post and Square images, then OR and the link.',
  usage: [
    'Put it inside a ShareDialog titled “Share game”.',
    'Only your own counted or fun games; never partial games. Available before the club publishes (D-2026-11-13-06).',
    'Pass public-safe participants: masked players carry no picture.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share dialog › Share game (shareModel game, .sh-card.one)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-player-game-row-court.md',
    'docs/mockup-changes/2026-11-13-player-share-cards-fill.md',
  ],
  related: ['ShareDialog', 'ShareImagePicker', 'ShareImage', 'SessionGamesShareCard'],
} satisfies ComponentMeta
