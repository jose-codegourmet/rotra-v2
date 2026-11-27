import type { ComponentMeta } from '@rotra/ui/meta'

export const editPencilButtonMeta = {
  name: 'EditPencilButton',
  description:
    'The Edit player pencil: a 28 px accent circle with a pencil, labelled "Edit NAME". Opens EditLivePlayerSheet.',
  usage: [
    'Live Players card (PlayerPoolCard): pass floating; the card places it over its top-right corner.',
    'Preparation roster card and row (RosterCard, RosterRow): beside the remove ×; the sheet opens in the preparing mode (Club nickname and Handicap only).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players card (.pc3-edit) · Roster and levels card (.rv-edit)',
  },
  docs: ['docs/mockup-changes/2026-11-27-queue-edit-player-limits.md'],
  variants: ['inline', 'floating'],
  related: ['EditLivePlayerSheet', 'PlayerPoolCard', 'RosterCard', 'RosterRow'],
} satisfies ComponentMeta
