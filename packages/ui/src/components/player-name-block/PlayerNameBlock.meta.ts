import type { ComponentMeta } from '@rotra/ui/meta'

export const playerNameBlockMeta = {
  name: 'PlayerNameBlock',
  description:
    'The club-facing player name: the first present name in the order club nickname, nickname, full name in bold, the others under it in one muted line joined with " · " (Migo, then "Migs · Miguel Santos"). A player with no nicknames shows the full name only.',
  usage: [
    'Use in roster rows, roster cards and other club-facing player lists; pass fullName always, nickname and clubNickname when present.',
    'The club nickname applies to registered players only: the caller passes it only then.',
    'Do not use on public pages: they keep their own masking rule (pubNameHtml).',
    'The live Players card shows one name only (PlayerPoolCard); it does not use this block.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'nameB(p) and nameParts(p), used by rvRow and rvCard',
  },
  docs: ['docs/mockup-changes/2026-11-19-queue-roster-name-order.md'],
  variants: ['all three names', 'nickname only', 'full name only'],
  related: ['RosterRow', 'RosterCard', 'PlayerPoolCard'],
} satisfies ComponentMeta
