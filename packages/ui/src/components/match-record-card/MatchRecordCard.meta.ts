import type { ComponentMeta } from '@rotra/ui/meta'

export const matchRecordCardMeta = {
  name: 'MatchRecordCard',
  description:
    'One recorded match in a session record: "#N", its time range, a Fun chip when relevant, both teams with the winning side highlighted "Won", the score, "no score" or an Invalid chip, and "S substitutions; partial games not counted".',
  usage: [
    'Use in the How the night ran tab of a Queue Session record (Q-HISTORY), one column per court listing matches in play order. Never for live or waiting matches: those are MatchCard and CourtCard.',
    'Results are permanent: the card has no edit controls. An invalid match is dimmed with a dashed border and an Invalid chip.',
    "Pass `highlighted` for the match on court at the replay's current moment (the prototype's .hm.now); the container that runs the replay decides which.",
    'Player pictures are buttons named "NAME. View profile" that call onSelectPlayer.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen:
      'Q-HISTORY › histNightPane() › historyMatch() (.hist-col, .hm, .hm-team.won, .hm-score, .hm.now)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md#q-match-record--read-only-outcome',
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/business_logic/product/queue/modules/results/README.md#session-record',
  ],
  variants: ['completed', 'invalid', 'highlighted'],
  related: ['ReplayCard', 'MatchCard', 'Avatar', 'Chip'],
} satisfies ComponentMeta
