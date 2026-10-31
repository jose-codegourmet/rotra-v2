import type { ComponentMeta } from '@rotra/ui/meta'

export const recordPlayerCardMeta = {
  name: 'RecordPlayerCard',
  description:
    'One player on a session record\'s Players tab: picture, rank chip, name, level, counted games against the minimum, W–L and the minimum chip (Above minimum / Met minimum / N short). An invalid session shows "Not counted" instead of the stats.',
  usage: [
    'Use in the Players tab grid of a Queue Session record (Q-HISTORY), most games first; the container renders the "Minimum N games · M below it" header.',
    'Pass `rank` only for players with at least one counted game (the standings rows); it is highlighted for the top three. Players without a counted game get no chip.',
    'Use variant "not-counted" for every card of an invalid session. Partial and invalid games are already left out of `games`, `wins` and `losses` by the standings rules.',
    'The picture is a button named "NAME. View profile" that calls onSelectPlayer. Not for live sessions: the console roster uses PlayerPoolCard.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › histPlayersPane() (.pgrid2, .pcard2, .stats)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/business_logic/product/queue/modules/results/README.md#session-record',
  ],
  variants: ['counted', 'not-counted'],
  related: ['Avatar', 'Chip', 'LiveLeaderboard', 'PlayerPoolCard', 'SessionRecordHeader'],
} satisfies ComponentMeta
