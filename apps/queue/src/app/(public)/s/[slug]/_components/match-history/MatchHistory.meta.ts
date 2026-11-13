import type { ComponentMeta } from '@rotra/ui/meta'

export const matchHistoryMeta = {
  name: 'MatchHistory',
  description:
    'Finished session page container: the signed-in read’s match history as PublicMatchHistory, with the replay (ReplayCard) on All once the results are shared.',
  usage: [
    'Rendered by PublicSession on the Details tab of a finished session, where the Queue was.',
    'Replay state is local: it opens at the end of the night; Play starts from the first match and advances one session minute every 120 ms. On All only matches started by the replay’s time show, newest first, and the ones on court glow.',
    'Faces (cards and replay) open the participant profile card through `onOpenParticipant`.',
    'A visitor (no history) sees the Log in line.',
  ],
  docs: [
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
    'docs/mockup-changes/2026-11-13-queue-match-history-courts.md',
    'docs/screens/product/modules/queue/public-session.md',
  ],
  related: ['PublicMatchHistory', 'MatchCourt', 'ReplayCard', 'PublicSession'],
} satisfies ComponentMeta
