import type { ComponentMeta } from '@rotra/ui/meta'

export const matchLineupFormMeta = {
  name: 'MatchLineupForm',
  description:
    'The Q-MANUAL sheet "Add match" / "Edit lineup": Format buttons (the enabled standard formats, then 1v2, 3v3, 4v4 and 5v5 fun), Team A / Team B slot columns sized by the format, "+ Choose player" slots that open the PlayerPickerSheet, and the primary "Add to queue" / "Save lineup".',
  usage: [
    'Open it from Add match (mode "add"), a queue card\'s Edit (mode "edit" with the match as lineup), or Q-SUGGEST\'s "Edit then add" (mode "add" with the suggested lineup).',
    'Pass enabledFormats from the session (allowSingles / allowDoubles): a standard format that is off never appears. The editor opens on Doubles if on, else Singles, else 3v3; changing format trims extra slots.',
    'players is the roster in picker order (pickerOrder in @rotra/data/match/queue.rules) with games, presence, court and rest; filled slots and the picker both read from it.',
    'onSubmit receives a complete MatchLineup ready for useAddMatch / useUpdateMatchLineup. The container owns the mutation, the "Match added to the queue" / "Lineup saved · protected from regeneration" toasts, the switch to the Queue tab, and serverError; a failed save keeps the lineup.',
    'The slot columns sit in a SwapSidesArea with allowEmptyTargets and each slot is a SwappablePlayer: drag a player onto a slot on the other team (an empty one too), or press left or right arrow on a filled slot, to switch sides. The change lives in the form until Save lineup.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.editor (.slots, .slot-col, .slot-btn; ACT.openEditor, ACT.editorFormat, ACT.saveEditor)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-manual--add-match--edit-lineup',
    'docs/business_logic/product/queue/modules/queueing/README.md#manual-editor',
    'docs/business_logic/product/queue/modules/matches/README.md#formats',
    'docs/coding-conventions.md#6-forms',
  ],
  related: ['PlayerPickerSheet', 'PlayerTile', 'SwapSidesArea', 'SwappablePlayer', 'Sheet', 'Button', 'IconButton', 'Avatar'],
} satisfies ComponentMeta
