import type { ComponentMeta } from '@rotra/ui/meta'

export const swapPickerSheetMeta = {
  name: 'SwapPickerSheet',
  description:
    'The player picker for Replace (before and during play) and Substitute. Opens compact (about 620 px, one column): the title, Who\'s coming out/off (the match\'s players, 4 per row), Suggested (seven free players with the fewest games, longest rest first, plus a dashed "+ Other · All players" tile), the extra choice and the one primary action. Other shows All players — a full-width search, a skill-level filter, a sort that reverses on a second tap (Longest/Shortest wait, Fewest/Most games, Name A–Z/Z–A) and pages of 24, free players first and the rest greyed out with Away / Playing / On court.',
  usage: [
    '900 px and wider: Other widens the dialog to about 75% of the screen with All players as an edge-to-edge panel on the right; the tile becomes "− Hide".',
    'Under 900 px: Other opens All players as a second dialog stacked over the picker; tapping a player picks them and closes it; × or the backdrop closes it without picking.',
    'A player picked from All players takes the first Suggested slot so the compact view always shows the choice.',
    'There is no header bar and no Back button: the title is the left column\'s first line (the heading stays for screen readers) and the floating × ("Back to match N") and the backdrop return to the match.',
    'Pass the Replace notice ("Replace fixes a mistake…" during play, the lineup-change line before Start) or the substitution\'s "Who gets this game?" as extra, and Replace player / Review substitution as action.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'swapPicker(), SHEETS.replace, SHEETS.sub, ACT.spOther / ACT.spSort, .sp-* styles',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/mockup-changes/2026-11-13-queue-replace-during-play.md',
  ],
  variants: ['compact', 'expanded', 'stacked (phone)', 'no free player', 'substitute', 'something changed'],
  related: ['PlayerActionSheet', 'ActiveMatchSheet', 'SubstitutionSheet', 'ReplacePlayerSheet', 'Pager'],
} satisfies ComponentMeta
