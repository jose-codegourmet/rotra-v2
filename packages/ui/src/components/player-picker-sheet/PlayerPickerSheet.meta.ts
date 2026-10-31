import type { ComponentMeta } from '@rotra/ui/meta'

export const playerPickerSheetMeta = {
  name: 'PlayerPickerSheet',
  description:
    'The Q-PICK-PLAYER sheet "Choose Team A · player N": search by name or nickname, the Available now / All present / Everyone filter, and a grid of PlayerTiles. Players already in another slot are disabled with "Already in this match". Footer "Back to lineup".',
  usage: [
    'Opened by MatchLineupForm when a slot is tapped. Pass the roster already sorted by the queue rules (off court first, present first, fewest games, longest rest: pickerOrder in @rotra/data/match/queue.rules); the sheet only applies the filter and the search.',
    'currentId is the player already in this slot (shown pressed); takenIds are the players in the other slots (disabled). onChoose reports the chosen id; onBack closes without choosing.',
    'Because the Sheet returns focus to what opened it, focus lands back on the slot button after Back to lineup or a choice.',
    'The filter and search live inside the sheet and reset when it unmounts; render it only while open.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'pickerSheet() (.pick-grid, .seg), opened from SHEETS.editor',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-pick-player--choose-a-slots-player',
    'docs/business_logic/product/queue/modules/queueing/README.md#manual-editor',
  ],
  related: ['PlayerTile', 'MatchLineupForm', 'SegmentedControl', 'Sheet', 'EmptyState'],
} satisfies ComponentMeta
