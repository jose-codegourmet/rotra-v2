import type { ComponentMeta } from '@rotra/ui/meta'

export const playerNameBlockMeta = {
  name: 'PlayerNameBlock',
  description:
    'The club-facing player name: the first present name in the order club nickname, nickname, full name, each shown once. Inline (default): the first in bold, the others in one muted line joined with " · ". Stack: each other name on its own smaller line (11 px, the second fg2, the third fg3, one line each with an ellipsis). Face: a picture caption; with no nicknames the label is the first name and the full name sits under it, and on a court the smaller lines sit in the dark pill and hide when the court container is 240 px or narrower.',
  usage: [
    'Use in roster rows, roster cards and other club-facing player lists; pass fullName always, nickname and clubNickname when present.',
    'The club nickname applies to registered players only: the caller passes it only then.',
    'Do not use on public pages: they keep their own masking rule (pubNameHtml).',
    'Inline text ("A & B" rows, sentences, toasts) keeps one short name and does not use this block.',
    'layout="stack" is used by PlayerPoolCard, PlayerTile, SwapPickerSheet tiles and MatchPlayerCard; layout="face" by PlayerFaceButton and the MatchCard faces (tone photo on a court, plain on a queue card). The photo tone hides its lines through a container query, so put it inside an @container (CourtDrawing is one).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'nameB(p), nameParts(p), nameStack(p), subNames(p) and faceNames(pid, cls)',
  },
  docs: [
    'docs/mockup-changes/2026-11-19-queue-roster-name-order.md',
    'docs/mockup-changes/2026-11-26-queue-name-hierarchy.md',
  ],
  variants: [
    'inline',
    'stack',
    'face (photo, plain)',
    'all three names',
    'nickname only',
    'full name only',
  ],
  related: ['RosterRow', 'RosterCard', 'PlayerPoolCard'],
} satisfies ComponentMeta
