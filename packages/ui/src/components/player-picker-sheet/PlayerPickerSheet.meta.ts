import type { ComponentMeta } from '@rotra/ui/meta'

export const playerPickerSheetMeta = {
  name: 'PlayerPickerSheet',
  description:
    'Two variants. Lineup: the Q-PICK-PLAYER sheet "Choose Team A · player N": search by name or nickname, the Available now / All present / Everyone filter, and a grid of PlayerTiles. Players already in another slot are disabled with "Already in this match". Footer "Back to lineup". Match request: "Choose partner / opponent" with All / Playing / Available tabs, a skill filter and a sort over present players; footer Anyone and Back.',
  usage: [
    'Opened by MatchLineupForm when a slot is tapped. Pass the roster already sorted by the queue rules (off court first, present first, fewest games, longest rest: pickerOrder in @rotra/data/match/queue.rules); the sheet only applies the filter and the search.',
    'currentId is the player already in this slot (shown pressed); takenIds are the players in the other slots (disabled). onChoose reports the chosen id; onBack closes without choosing.',
    'Because the Sheet returns focus to what opened it, focus lands back on the slot button after Back to lineup or a choice.',
    'The filter and search live inside the sheet and reset when it unmounts; render it only while open.',
    'Match request: pass variant="matchRequest" with spotLabel ("Partner", "Opponent 1"), the present players other than the viewer, pickedIds (disabled, "Already picked"), onChoose, onAnyone and onBack. The sheet adds the All / Playing / Available tabs with counts, the skill filter and the sort (Fewest games by default) and applies them; they reset when it unmounts, so render it only while open.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'pickerSheet() (.pick-grid, .seg), opened from SHEETS.editor; match request: SHEETS.matchReq, sh.picking (.tabs, .seg, .pick-grid)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-pick-player--choose-a-slots-player',
    'docs/business_logic/product/queue/modules/queueing/README.md#manual-editor',
    'docs/screens/product/modules/queue/public-session.md',
  ],
  related: ['PlayerTile', 'MatchLineupForm', 'SegmentedControl', 'Tabs', 'Sheet', 'EmptyState'],
} satisfies ComponentMeta
