import type { ComponentMeta } from '@rotra/ui/meta'

export const matchPlayerCardMeta = {
  name: 'MatchPlayerCard',
  description:
    'A player on a match dialog: picture or initials with a 3 px level-band ring (grey with no level), name and games against the session minimum (amber when below). The level is not text: hover names it and the screen-reader label keeps it. Tapping it opens the profile; the swappable variant splits it into a picture button (profile) and a card button with a swap icon.',
  usage: [
    'Use inside TeamLineup on the Suggested match, Start match, Active match and Invalid match sheets.',
    'Pass swappable when TeamLineup wraps it in a SwappablePlayer (Suggested match, Start match); it only adds the arrow-key hint to the accessible name, the wrapper owns the drag and keys.',
    'Pass variant="swappable" with onOpenProfile on Open match (Playing and Getting ready): the picture opens the profile, the card (onClick) brings in someone from outside. Picture and card are sibling buttons, each with a visible focus ring. Other dialogs keep the default whole-card profile button.',
    'Do not use on queue cards or court drawings; those use PlayerFaceButton. Do not use for picking a player; that is PlayerPoolCard.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SUGGEST › faceTeam() (.sg-p)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['TeamLineup', 'SwappablePlayer', 'PlayerFaceButton', 'PlayerPoolCard', 'Avatar'],
} satisfies ComponentMeta
