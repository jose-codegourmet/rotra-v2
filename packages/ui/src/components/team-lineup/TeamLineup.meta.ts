import type { ComponentMeta } from '@rotra/ui/meta'

export const teamLineupMeta = {
  name: 'TeamLineup',
  description:
    'Team A VS Team B on a match dialog: two labelled groups of MatchPlayerCards with the VS mark between them. In swap mode players can be switched to the other team.',
  usage: [
    'Use on the Suggested match, Start match, Active match and Invalid match sheets.',
    'Pass onSwap where sides can be switched (Suggested match, Start match): the cards become SwappablePlayers inside a SwapSidesArea (drag onto the other team, or ← / →), and the owner applies the reported swap to its lineup.',
    'Do not use on queue cards (MatchCard draws its own faces) or for picking players (Q-MANUAL slots).',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SUGGEST › .qteams with faceTeam() (.sg-team, .vs)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/screens/product/modules/queue/match-control.md',
  ],
  related: [
    'MatchPlayerCard',
    'SwapSidesArea',
    'SwappablePlayer',
    'SuggestedMatchSheet',
    'MatchCard',
  ],
} satisfies ComponentMeta
