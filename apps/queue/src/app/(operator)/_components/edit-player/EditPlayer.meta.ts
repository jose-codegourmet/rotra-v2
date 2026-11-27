import type { ComponentMeta } from '@rotra/ui/meta'

export const editPlayerMeta = {
  name: 'EditPlayer',
  description:
    'D-EDIT-LIVE-PLAYER container: EditLivePlayerSheet for one roster entry. The Queue Master edits only Club nickname, Games played, Availability and Handicap (mockup change 2026-11-27); in the preparing mode only Club nickname and Handicap.',
  usage: [
    'PlayersView: mode "live" from the Players card pencil, with games, match and flushPresence.',
    'PreparationRoster: mode "preparing" from the Roster and levels pencil, before Start.',
    'Saves only what changed; toasts "Changes saved · NAME" or "No changes"; a failure keeps the sheet open.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.editLive (openEditLive, saveEditLive)',
  },
  docs: [
    'docs/mockup-changes/2026-11-27-queue-edit-player-limits.md',
    'docs/screens/product/dialogs.md#d-edit-live-player--edit-player-during-a-session',
  ],
  related: ['EditLivePlayerSheet', 'EditPencilButton', 'PlayersView', 'PreparationRoster'],
} satisfies ComponentMeta
