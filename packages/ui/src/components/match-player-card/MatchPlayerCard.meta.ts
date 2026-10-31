import type { ComponentMeta } from '@rotra/ui/meta'

export const matchPlayerCardMeta = {
  name: 'MatchPlayerCard',
  description:
    'A player on a match dialog: picture or initials, name, level and games against the session minimum (amber when below). Tapping it opens the profile; in swap mode the arrow keys switch sides.',
  usage: [
    'Use inside TeamLineup on the Suggested match, Start match, Active match and Invalid match sheets.',
    'Pass swappable when TeamLineup wraps it in a SwappablePlayer (Suggested match, Start match); it only adds the arrow-key hint to the accessible name, the wrapper owns the drag and keys.',
    'Do not use on queue cards or court drawings; those use PlayerFaceButton. Do not use for picking a player; that is PlayerPoolCard.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-SUGGEST › faceTeam() (.sg-p)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['TeamLineup', 'SwappablePlayer', 'PlayerFaceButton', 'PlayerPoolCard', 'Avatar'],
} satisfies ComponentMeta
